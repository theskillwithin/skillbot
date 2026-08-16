#!/usr/bin/env node
"use strict";
require("dotenv").config({ quiet: true });
const IRC = require("irc-framework");
const get = require("lodash/get");

const SERVER = "irc.libera.chat";
const NICK = "skillbot";

const client = new IRC.Client();

const ignoreList = ["skillbot", "jellobot", "ecmabot"];

const greekQuestionMark = (from, message, channel, c) => {
  if (/\u037E/g.test(message)) {
    c.say(
      channel,
      `Warning! ${from}: You have used a greek question mark(u037E) instead of a semicolon(u003B)!`
    );
  }
};

// const convertSecondsToTime = (givenSeconds) => {
//   const dateObj = new Date(givenSeconds * 1000);
//   const hours = dateObj.getUTCHours();
//   const minutes = dateObj.getUTCMinutes();
//   const seconds = dateObj.getSeconds();

//   const time = `${hours
//     .toString()
//     .padStart(2, "0")}:${minutes
//     .toString()
//     .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

//   return time;
// };

const getYoutubeId = (message) => {
  const regexp =
    /((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|shorts\/|live\/|v\/)?)(?<id>[\w-]+)/g;
  const exec = regexp.exec(message);
  return exec && exec.groups && exec.groups.id;
};

const youtubeURL = (id) =>
  `https://www.googleapis.com/youtube/v3/videos?part=id%2C+snippet&id=${id}&key=${process.env.YOUTUBE}`;

const youtubeTitle = async (from, message, channel, c) => {
  const id = getYoutubeId(message);
  if (!id) return;

  const splitTimeFromId = id.split("?t=");

  const idWithoutTime = splitTimeFromId[0];

  // const time = splitTimeFromId[1] && convertSecondsToTime(splitTimeFromId[1]);

  try {
    const response = await fetch(youtubeURL(idWithoutTime), {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`YouTube API error: ${response.status} for ${idWithoutTime}`);
      return;
    }

    const res = await response.json();
    const title = get(res, "items[0].snippet.title", false);
    if (title) {
      c.say(channel, `\x0304,01►\x03 \x0314,01YouTube\x03 :: ${title}`);
    }
    // if (/Rick Astley/gi.test(title)) {
    //   c.say(
    //     channel,
    //     `Warning! ${from}: That video may possibly be a Rick Roll!`
    //   );
    // }
  } catch (error) {
    console.error("YouTube lookup failed: ", error);
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

const thankYouMayIHaveAHandShake = (from, message, channel, c) => {
  if (message.toLowerCase().includes("thank you may i have a handshake")) {
    return c.action(channel, `shakes ${from}'s hand`);
  }
};

const pasteCommand = (from, message, channel, c) => {
  const lowerMessage = message.toLowerCase().trim();

  // Match !paste or paste @ [username]
  const pasteMatch = lowerMessage.match(/^!?paste(?:\s+@\s+(\S+))?$/);

  if (pasteMatch) {
    const targetUser = pasteMatch[1] || from;
    return c.say(
      channel,
      `${targetUser}: please paste your code or provide a minimal example (e.g., gist.github.com)`
    );
  }
};

const dontPasteCommand = (from, message, channel, c) => {
  const lowerMessage = message.toLowerCase().trim();

  // Match !don't paste or !dont paste
  const dontPasteMatch = lowerMessage.match(/^!?(?:don'?t|dont)\s+paste$/);

  if (dontPasteMatch) {
    return c.say(channel, `gurrr can read your mind`);
  }
};

const calcWeight = (from, message, channel, c) => {
  if (message.charAt(0) === ">") {
    const kiloPoundsConversionNumber = 2.20462;

    const matchKilosToPounds = message.match(/^>k2p (\d{1,9}?[.]?\d{0,4})$/);

    if (matchKilosToPounds) {
      const kilos = parseFloat(matchKilosToPounds[1]);

      const pounds = kilos * kiloPoundsConversionNumber;

      const isPoundsModToHalf = isModToHalf(pounds);
      const isPoundsModToQuaterUp = isModToQuarterUp(pounds);

      const truncPounds = Math.trunc(pounds);
      return c.say(
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
      return c.say(
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
      return c.say(
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
      return c.say(
        channel,
        `${poundsExact} pounds is about ${roundKilosExact} kilos`
      );
    }
  }
};

// Channels the bot joins, and which handlers run on messages in each one.
// A channel with an empty handler list is joined but otherwise ignored.
const channels = {
  "#theskillwithin": [
    greekQuestionMark,
    youtubeTitle,
    calcWeight,
    thankYouMayIHaveAHandShake,
    pasteCommand,
    dontPasteCommand,
  ],
  "##ketochat": [youtubeTitle, calcWeight],
  "#gatsbyjs": [],
  "#nextjs": [greekQuestionMark, youtubeTitle],
  "#reactjs": [greekQuestionMark, youtubeTitle, pasteCommand, dontPasteCommand],
  "#severance": [greekQuestionMark, youtubeTitle, thankYouMayIHaveAHandShake],
  "##premiere": [greekQuestionMark, youtubeTitle, thankYouMayIHaveAHandShake],
  "##blackpilled": [greekQuestionMark, youtubeTitle, thankYouMayIHaveAHandShake],
  "#typescript": [
    greekQuestionMark,
    youtubeTitle,
    pasteCommand,
    dontPasteCommand,
  ],
  "#gp": [greekQuestionMark, youtubeTitle],
  "#comedy": [youtubeTitle],
  "#primate": [greekQuestionMark, youtubeTitle],
  "#metal": [youtubeTitle],
  "#adhd": [youtubeTitle],
  // "#javascript": [greekQuestionMark, youtubeTitle],
};

const handlersFor = (target) => {
  const name = Object.keys(channels).find(
    (channel) => channel.toLowerCase() === String(target).toLowerCase()
  );

  return name ? channels[name] : undefined;
};

const HOME_CHANNEL = "#theskillwithin";

client.on("registered", () => {
  client.say("NickServ", `IDENTIFY ${NICK} ${process.env.IDENTIFY}`);

  // The home channel is joined right away so private messages can be relayed
  // immediately; the rest wait for NickServ to finish identifying us.
  client.join(HOME_CHANNEL);

  setTimeout(() => {
    Object.keys(channels).forEach((channel) => {
      client.join(channel);
    });
  }, 10000);
});

// irc-framework does not retry the nick by itself, and without a nick the
// server never sends us a welcome, so nothing else would ever happen.
const MAX_NICK_ATTEMPTS = 3;
let nickAttempts = 0;

client.on("nick in use", (event) => {
  if (nickAttempts >= MAX_NICK_ATTEMPTS) {
    console.error(`Nick ${event.nick} is in use, giving up on renaming`);
    return;
  }

  nickAttempts += 1;
  const nick = `${NICK}${"_".repeat(nickAttempts)}`;
  console.error(`Nick ${event.nick} is in use, trying ${nick}`);
  client.changeNick(nick);
});

client.on("privmsg", (event) => {
  const from = event.nick;
  const { target, message } = event;

  // Messages addressed to a subset of a channel (`@#channel`, `+#channel`)
  // arrive with the prefix stripped. Answering them would reply to everyone.
  if (event.target_group) return;

  // A private message to the bot gets relayed to the main channel. This
  // deliberately runs before the ignore list, matching the old behaviour.
  if (client.caseCompare(target, client.user.nick)) {
    client.say(HOME_CHANNEL, `${from}: ${message}`);
    return;
  }

  if (ignoreList.includes(String(from).toLowerCase())) return;

  const handlers = handlersFor(target);
  if (!handlers) return;

  handlers.forEach((handler) => {
    try {
      handler(from, message, target, client);
    } catch (error) {
      console.error("Handler error: ", error);
    }
  });
});

client.on("irc error", (event) => {
  console.error("IRC Error: ", event);
});

client.on("socket close", () => {
  console.error("IRC socket closed, reconnecting");
});

client.on("close", () => {
  console.error("IRC connection closed for good");
});

client.connect({
  host: SERVER,
  port: 6697,
  tls: true,
  rejectUnauthorized: true,
  nick: NICK,
  username: NICK,
  gecos: NICK,
  auto_reconnect: true,
  // The old client retried forever; keep that rather than giving up and
  // sitting there disconnected after a long outage.
  auto_reconnect_max_retries: Infinity,
  auto_reconnect_max_wait: 300000,
  ping_interval: 30,
  ping_timeout: 120,
});
