#!/usr/bin/env node
"use strict";
require("dotenv").config({ path: ".env" });
const irc = require("irc");
const fetch = require("node-fetch");
const get = require("lodash/get");
const client = new irc.Client("chat.freenode.net", "skillbot", {
  channels: ["#theskillwithin"],
  userName: "skillbot",
  realName: "skillbot"
});

const register = () => {
  client.say("NickServ", `IDENTIFY skillbot ${process.env.IDENTIFY}`);

  setTimeout(() => {
    client.join("#theskillwithin");
    client.join("##javascript");
  }, 10000);
};

client.addListener("registered", register);

const greekQuestionMark = (from, message, channel) => {
  if (/\u037E/g.test(message)) {
    client.say(
      channel,
      `Warning! ${from}: You have used a greek question mark(u037E) instead of a semicolon(u003B)!`
    );
  }
};

function getYoutubeId(message) {
  const regexp = /((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)(?<id>([\w\-]+)(\S+)?)/g;
  const exec = regexp.exec(message);
  return exec && exec.groups && exec.groups.id;
}

const youtubeURL = id =>
  `https://www.googleapis.com/youtube/v3/videos?part=id%2C+snippet&id=${id}&key=${process.env.YOUTUBE}`;

const rickRoll = async (from, message, channel) => {
  const id = getYoutubeId(message);
  if (id) {
    await fetch(youtubeURL(id), {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    })
      .then(r => r.json())
      .then(res => {
        const title = get(res, "items[0].snippet.title", false);
        if (/Rick Astley/gi.test(title)) {
          client.say(
            channel,
            `Warning! ${from}: That video may possibly be a Rick Roll!`
          );
        }
      });
  }
};

client.addListener("message#theskillwithin", (from, message) => {
  greekQuestionMark(from, message, "#theskillwithin");
  rickRoll(from, message, "#theskillwithin");
});

client.addListener("message##javascript", (from, message) => {
  greekQuestionMark(from, message, "#theskillwithin");
  rickRoll(from, message, "##javascript");
});

client.addListener("pm", function(from, message) {
  client.say("#theskillwithin", `${from}: ${message}`);
});
