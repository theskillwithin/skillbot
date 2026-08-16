#!/usr/bin/env node
"use strict";

// Dependency-free smoke test for the message routing in index.js.
//
// index.js connects to IRC on load, so `irc-framework` is stubbed out before
// requiring it. The stub records everything the bot would have sent, which is
// then asserted against below.

const assert = require("node:assert/strict");
const EventEmitter = require("node:events");
const Module = require("node:module");
const test = require("node:test");

const sent = [];
let bot;

class FakeClient extends EventEmitter {
  constructor() {
    super();
    this.user = { nick: "skillbot" };
    this.joined = [];
    this.options = undefined;
  }

  connect(options) {
    this.options = options;
    this.user.nick = options.nick;
  }

  say(target, message) {
    sent.push({ type: "say", target, message });
  }

  action(target, message) {
    sent.push({ type: "action", target, message });
  }

  join(channel) {
    this.joined.push(channel);
  }
}

const load = Module._load;
Module._load = function stubbed(request, ...rest) {
  if (request === "irc-framework") {
    return {
      Client: function Client() {
        bot = new FakeClient();
        return bot;
      },
    };
  }

  return load.call(this, request, ...rest);
};

// Keep the YouTube handler from making real network calls.
let youtubeResponse = { items: [{ snippet: { title: "A Video Title" } }] };
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => youtubeResponse,
});

process.env.IDENTIFY = "hunter2";
process.env.YOUTUBE = "test-key";

require("./index.js");

const privmsg = (nick, target, message) => {
  sent.length = 0;
  bot.emit("privmsg", { nick, target, message });
};

// Let the async YouTube handler settle before asserting.
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("connects to libera over TLS as skillbot", () => {
  assert.equal(bot.options.host, "irc.libera.chat");
  assert.equal(bot.options.port, 6697);
  assert.equal(bot.options.tls, true);
  assert.equal(bot.options.rejectUnauthorized, true);
  assert.equal(bot.options.nick, "skillbot");
});

test("identifies with NickServ and joins every channel on register", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  sent.length = 0;

  bot.emit("registered");

  assert.deepEqual(sent, [
    { type: "say", target: "NickServ", message: "IDENTIFY skillbot hunter2" },
  ]);
  assert.deepEqual(bot.joined, [], "waits before joining");

  t.mock.timers.tick(10000);

  assert.ok(bot.joined.includes("#theskillwithin"));
  assert.ok(bot.joined.includes("##ketochat"));
  assert.ok(bot.joined.includes("#gatsbyjs"));
  assert.ok(bot.joined.includes("#adhd"));
  assert.equal(bot.joined.length, 14);
});

test("warns about greek question marks", () => {
  privmsg("someone", "#theskillwithin", "const a = 1\u037E");

  assert.equal(sent.length, 1);
  assert.equal(sent[0].target, "#theskillwithin");
  assert.match(sent[0].message, /greek question mark/);
});

test("does not treat a normal semicolon as a greek question mark", () => {
  privmsg("someone", "#theskillwithin", "const a = 1;");

  assert.deepEqual(sent, []);
});

test("ignores other bots", () => {
  privmsg("jellobot", "#theskillwithin", "const a = 1\u037E");

  assert.deepEqual(sent, []);
});

test("only runs handlers registered for the channel", () => {
  // #metal only gets the youtube handler, not the greek question mark one.
  privmsg("someone", "#metal", "const a = 1\u037E");

  assert.deepEqual(sent, []);
});

test("ignores channels it does not know about", () => {
  privmsg("someone", "#not-a-channel-it-joined", "const a = 1\u037E");

  assert.deepEqual(sent, []);
});

test("matches channel names case-insensitively", () => {
  privmsg("someone", "#TheSkillWithin", "const a = 1\u037E");

  assert.equal(sent.length, 1);
});

test("converts kilos to pounds", () => {
  privmsg("someone", "##ketochat", ">k2p 100");

  assert.deepEqual(sent, [
    {
      type: "say",
      target: "##ketochat",
      message: "100 kilos is about 220 and a half pounds",
    },
  ]);
});

test("converts pounds to kilos exactly", () => {
  privmsg("someone", "##ketochat", ">p2k! 100");

  assert.deepEqual(sent, [
    {
      type: "say",
      target: "##ketochat",
      message: "100 pounds is about 45.36 kilos",
    },
  ]);
});

test("responds to the handshake request with an action", () => {
  privmsg("someone", "#severance", "thank you may i have a handshake");

  assert.deepEqual(sent, [
    {
      type: "action",
      target: "#severance",
      message: "shakes someone's hand",
    },
  ]);
});

test("answers !paste, optionally aimed at another user", () => {
  privmsg("asker", "#reactjs", "!paste");
  assert.equal(sent.length, 1);
  assert.match(sent[0].message, /^asker: please paste your code/);

  privmsg("asker", "#reactjs", "!paste @ helper");
  assert.equal(sent.length, 1);
  assert.match(sent[0].message, /^helper: please paste your code/);
});

test("answers !dont paste", () => {
  privmsg("asker", "#typescript", "!dont paste");

  assert.deepEqual(sent, [
    {
      type: "say",
      target: "#typescript",
      message: "gurrr can read your mind",
    },
  ]);
});

test("posts youtube titles", async () => {
  privmsg("someone", "#comedy", "look at https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await settle();

  assert.equal(sent.length, 1);
  assert.match(sent[0].message, /YouTube.*A Video Title/);
});

test("stays quiet when the youtube lookup returns nothing", async () => {
  youtubeResponse = { items: [] };
  privmsg("someone", "#comedy", "https://youtu.be/dQw4w9WgXcQ");
  await settle();

  assert.deepEqual(sent, []);
  youtubeResponse = { items: [{ snippet: { title: "A Video Title" } }] };
});

test("survives a failing youtube lookup", async () => {
  const ok = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network down");
  };

  privmsg("someone", "#comedy", "https://youtu.be/dQw4w9WgXcQ");
  await settle();

  assert.deepEqual(sent, []);
  globalThis.fetch = ok;
});

test("relays private messages to the main channel", () => {
  privmsg("someone", "skillbot", "hello there");

  assert.deepEqual(sent, [
    {
      type: "say",
      target: "#theskillwithin",
      message: "someone: hello there",
    },
  ]);
});
