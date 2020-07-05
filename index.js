#!/usr/bin/env node
"use strict";
require("dotenv").config({ path: ".env" });
const irc = require("irc");
const fetch = require("node-fetch");
const get = require("lodash/get");
const client = new irc.Client("chat.freenode.net", "skillbot", {
  channels: ["#theskillwithin"],
  userName: "skillbot",
  realName: "skillbot",
});

const register = () => {
  client.say("NickServ", `IDENTIFY skillbot ${process.env.IDENTIFY}`);

  setTimeout(() => {
    client.join("#theskillwithin");
    client.join("##javascript");
    client.join("#ketochat");
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

const convertSecondsToTime = (givenSeconds) => {
  const dateObj = new Date(givenSeconds * 1000);
  const hours = dateObj.getUTCHours();
  const minutes = dateObj.getUTCMinutes();
  const seconds = dateObj.getSeconds();

  const time = `${hours
    .toString()
    .padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return time;
};

const getYoutubeId = (message) => {
  const regexp = /((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)(?<id>([\w\-]+)(\S+)?)/g;
  const exec = regexp.exec(message);
  return exec && exec.groups && exec.groups.id;
};

const youtubeURL = (id) =>
  `https://www.googleapis.com/youtube/v3/videos?part=id%2C+snippet&id=${id}&key=${process.env.YOUTUBE}`;

const youtubeTitle = async (from, message, channel) => {
  const id = getYoutubeId(message);
  if (id) {
    const splitTimeFromId = id.split("?t=");

    const idWithoutTime = splitTimeFromId[0];

    const time = splitTimeFromId[1] && convertSecondsToTime(splitTimeFromId[1]);

    await fetch(youtubeURL(idWithoutTime), {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .then((r) => r.json())
      .then((res) => {
        const title = get(res, "items[0].snippet.title", false);
        if (title) {
          client.say(
            channel,
            `youtube${time ? `timestamp: ${time},` : ""} title: ${title}`
          );
        }
        // if (/Rick Astley/gi.test(title)) {
        //   client.say(
        //     channel,
        //     `Warning! ${from}: That video may possibly be a Rick Roll!`
        //   );
        // }
      });
  }
};

const isModToHalf = (number) => {
  const mod = number % 1;

  const isModToHalf = mod > 0.25 && mod < 0.75;

  return isModToHalf;
};

const isModToQuarterUp = (number) => {
  const mod = number % 1;

  const isModToQuarterUp = mod > 0.75;

  return isModToQuarterUp;
};

const calcWeight = (from, message, channel) => {
  if (message.charAt(0) === ">") {
    const kiloPoundsConversionNumber = 2.20462;

    const matchKilosToPounds = message.match(/^>k2p (\d{1,9}?[.]?\d{0,4})$/);

    if (matchKilosToPounds) {
      const kilos = parseFloat(matchKilosToPounds[1]);

      const pounds = kilos * kiloPoundsConversionNumber;

      const isPoundsModToHalf = isModToHalf(pounds);
      const isPoundsModToQuaterUp = isModToQuarterUp(pounds);

      const truncPounds = Math.trunc(pounds);
      return client.say(
        channel,
        `${kilos} kilos is about ${
          isPoundsModToQuaterUp ? truncPounds + 1 : truncPounds
        }${isPoundsModToHalf ? " and a half" : ""} pounds`
      );
    }

    const matchPoundsToKilos = message.match(/^>p2k (\d{1,9}?[.]?\d{0,4})$/);

    if (matchPoundsToKilos) {
      const pounds = matchPoundsToKilos[1];

      const kilos = pounds / kiloPoundsConversionNumber;

      const isKilosModToHalf = isModToHalf(kilos);
      const isKilosModToQuaterUp = isModToQuarterUp(kilos);

      const truncKilos = Math.trunc(kilos);
      return client.say(
        channel,
        `${pounds} pounds is about ${
          isKilosModToQuaterUp ? truncKilos + 1 : truncKilos
        }${isKilosModToHalf ? " and a half" : ""} kilos`
      );
    }

    // more precise measurments (expiramental)

    const matchKilosToPoundsExact = message.match(
      /^>k2p! (\d{1,9}?[.]?\d{0,4})$/
    );
    if (matchKilosToPoundsExact) {
      const kilosExact = parseFloat(matchKilosToPoundsExact[1]);

      const poundsExact = kilosExact * kiloPoundsConversionNumber;
      const roundPoundsExact = Math.round(poundsExact * 100) / 100;
      return client.say(
        channel,
        `${kilosExact} kilos is about ${roundPoundsExact} pounds`
      );
    }

    const matchPoundsToKilosExact = message.match(
      /^>p2k! (\d{1,9}?[.]?\d{0,4})$/
    );

    if (matchPoundsToKilosExact) {
      const poundsExact = matchPoundsToKilosExact[1];

      const kilosExact = poundsExact / kiloPoundsConversionNumber;
      const roundKilosExact = Math.round(kilosExact * 100) / 100;
      return client.say(
        channel,
        `${poundsExact} pounds is about ${roundKilosExact} kilos`
      );
    }
  }
};

client.addListener("message#theskillwithin", (from, message) => {
  greekQuestionMark(from, message, "#theskillwithin");
  youtubeTitle(from, message, "#theskillwithin");
  calcWeight(from, message, "#theskillwithin");
});

client.addListener("message##javascript", (from, message) => {
  greekQuestionMark(from, message, "##javascript");
  youtubeTitle(from, message, "##javascript");
});

client.addListener("message#ketochat", (from, message) => {
  youtubeTitle(from, message, "#ketochat");
  calcWeight(from, message, "#ketochat");
});

client.addListener("pm", function (from, message) {
  client.say("#theskillwithin", `${from}: ${message}`);
});

client.addListener("error", (message) => {
  console.error("IRC Error: ", message);
});
