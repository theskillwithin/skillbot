# skillbot

An IRC bot for `#theskillwithin` and friends on [Libera.Chat](https://libera.chat).

It watches the channels it joins and responds to a handful of things:

- posts the title of any YouTube link it sees
- warns when a message contains a Greek question mark (`U+037E`) instead of a semicolon
- converts between kilos and pounds (`>k2p 100`, `>p2k 220`, and the exact `>k2p!` / `>p2k!` variants)
- answers `!paste` (optionally aimed at someone: `!paste @ nick`) and `!dont paste`
- shakes your hand if you ask nicely
- relays private messages to `#theskillwithin`

## Setup

Requires Node.js 18 or newer (the bot uses the built-in `fetch`).

```bash
npm install
```

Create a `.env` file:

```
IDENTIFY=your-nickserv-password
YOUTUBE=your-youtube-data-api-key
```

## Running

```bash
npm start
```

## Tests

```bash
npm test
```

The tests stub out `irc-framework`, so they run offline and never connect to a
real server.

## Adding a channel or a command

Channels and their handlers live in the `channels` map in `index.js`. Each entry
maps a channel name to the list of handlers that run on messages there, so
joining a new channel and choosing what it responds to is a single entry:

```js
const channels = {
  "#somechannel": [greekQuestionMark, youtubeTitle],
  // ...
};
```

A channel with an empty handler list is joined but otherwise ignored. Handlers
are called as `handler(from, message, channel, client)`.
