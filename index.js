#!/usr/bin/env node
"use strict";
require("dotenv").config({ path: ".env" });
const irc = require("irc");
const fetch = require("node-fetch");
const get = require("lodash/get");
const client = new irc.Client("chat.freenode.net", "skillbot", {
  channels: ["#theskillwithin"]
});

const register = () => {
  client.say("NickServ", `IDENTIFY skillbot ${process.env.IDENTIFY}`);

  setTimeout(() => {
    client.join("#theskillwithin");
    // client.join("##javascript");
  }, 10000);
};

client.addListener("registered", register);

client.addListener("message#theskillwithin", function(from, message) {
  if (/\u037E/g.test(message)) {
    client.say(
      "#theskillwithin",
      `Warning! ${from}: You have used a greek question mark(u037E) instead of a semicolon(u003B)!`
    );
    ``;
  }
});

client.addListener("message##javascript", function(from, message) {
  if (/\u037E/g.test(message)) {
    client.say(
      "##javascript",
      `Warning! ${from}: You have used a greek question mark(u037E) instead of a semicolon(u003B)!`
    );
  }
});

function getYoutubeId(message) {
  const regexp = /((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)(?<id>([\w\-]+)(\S+)?)/g;
  const exec = regexp.exec(message);
  return exec && exec.groups && exec.groups.id;
}

const youtubeURL = id =>
  `https://www.googleapis.com/youtube/v3/videos?part=id%2C+snippet&id=${id}=${process.env.YOUTUBE}`;

const rickRoll = async (from, message) => {
  const id = getYoutubeId(message);
  if (id) {
    await fetch(youtubeURL(id)).then(res => {
      const title = get(res, "items[0].snippet.title", false);
      if (/Rick Astley/gi.test(title)) {
        client.say(
          "#theskillwithin",
          `Warning! ${from}: That video may possible be a rick roll!`
        );
      }
    });
  }
};

client.addListener("message#theskillwithin", (from, message) =>
  rickRoll(from, message)
);
