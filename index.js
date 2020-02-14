"use strict";
require("dotenv").config({ path: ".env" });
const irc = require("irc");
const client = new irc.Client("chat.freenode.net", "skillbot", {
  channels: ["#theskillwithin"]
});

const register = () => {
  client.say("NickServ", `IDENTIFY skillbot ${process.env.IDENTIFY}`);

  setTimeout(() => {
    client.join("#theskillwithin");
  }, 5000);
};

client.addListener("registered", register);

client.addListener("message#theskillwithin", function(from, message) {
  if (/\u037E/g.test(message)) {
    client.say(
      "#theskillwithin",
      `Warning! ${from}: You have used a greek question mark(u037E) instead of a semicolon(u003B)!`
    );
  }
});
