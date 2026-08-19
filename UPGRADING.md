# Upgrading a running skillbot deployment

This release swaps the IRC client library and requires **Node.js 24**. There is
no database and no state to migrate — the upgrade is a reinstall and a restart.

## 0. Authentication moved to SASL

The bot now identifies with **SASL** during connection registration instead of
messaging NickServ after connecting.

Nothing new to configure — the same `IDENTIFY` secret is reused as the SASL
password. It is now required at startup: the bot exits immediately with
`IDENTIFY is not set` rather than silently running unidentified.

Why: the old flow sent `IDENTIFY` and then joined on a fixed 10-second timer,
with `#theskillwithin` joined immediately. A timer is a guess, not a
confirmation — whenever services lagged, joins went out before identification
completed and `+r` channels rejected them silently, leaving the bot in fewer
channels with nothing in the logs. SASL completes before registration
finishes, so joining while unidentified is no longer possible.

If authentication fails the bot now disconnects and logs
`SASL authentication failed (<reason>)` rather than carrying on unidentified.
Check that first if it starts looping on reconnect after this upgrade.

## 1. Node.js 24

`node-fetch` is gone; the bot uses the built-in `fetch`. Node 24 is the current
LTS and what this release is tested against.

With nvm:

```bash
nvm install 24
nvm use 24
node --version   # expect v24.x
```

Or from NodeSource on Debian/Ubuntu:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
```

If the bot runs under systemd with an absolute path to the old Node binary,
update `ExecStart` to the new one (`which node`) and `systemctl daemon-reload`.

## 2. Pull and reinstall

```bash
cd /path/to/skillbot
git pull
rm -rf node_modules
npm ci
npm test
```

`npm test` runs entirely offline — it stubs the IRC client and never connects to
a server — so it is safe to run on the box before restarting.

## 3. Environment

`.env` is unchanged. Both variables are still required:

```
IDENTIFY=your-nickserv-password
YOUTUBE=your-youtube-data-api-key
```

Nothing else needs to change. The bot joins the same channels and answers the
same commands as before.

## 4. Restart and watch

```bash
sudo systemctl restart skillbot    # or: pm2 restart skillbot
journalctl -u skillbot -f          # or: pm2 logs skillbot
```

What a healthy start looks like: the bot connects, identifies with NickServ,
joins `#theskillwithin` immediately, and joins the remaining channels 10 seconds
later.

Things it will now log that it never used to:

- `Nick skillbot is in use, trying skillbot_` — the old nick is still lingering
  on the server, usually because the process was killed rather than quit. The
  bot renames itself and carries on instead of hanging silently. It keeps the
  suffixed nick until the next restart.
- `IRC socket closed, reconnecting` — a normal blip; it reconnects with
  exponential backoff and retries indefinitely.
- `IRC connection closed for good` — it has stopped trying. This should not
  happen; if it does, restart the service.
- `YouTube lookup failed: ...` / `YouTube API error: 403` — a failed title
  lookup. Previously this crashed the whole process; now it is just a log line.
  A 403 usually means the API key is expired or over quota.

## Rolling back

```bash
git checkout <previous-commit>
rm -rf node_modules
npm ci
```

The previous release runs on Node 18+ and needs no other changes, so a rollback
does not require downgrading Node.
