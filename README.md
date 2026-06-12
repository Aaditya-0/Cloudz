# Cloudz

Cloudz is a Discord music bot built with Discord.js, Shoukaku, and Lavalink. It supports slash commands, embedded bot replies, a `/help` menu with an interactive command-list button, queue controls, and optional 24/7 voice-channel presence.

## Stack

- **Discord.js v14** handles Discord gateway events, slash commands, embeds, and buttons.
- **Shoukaku** connects the bot to Lavalink.
- **Lavalink v4** runs the audio server outside the bot process.
- **TypeScript** keeps the bot easier to maintain as it grows.

Use Lavalink and Shoukaku together: Lavalink is the playback backend, Shoukaku is the library the Discord bot uses to control it.

## Features

- Slash-command music controls
- Search suggestions while typing `/play query`
- Embedded replies for all bot-facing messages
- `/help` command with an **All Commands** button
- Queue display
- Pause, resume, skip, stop, and volume controls
- Optional 24/7 voice mode
- Local Lavalink support with either Docker or `Lavalink.jar`

## Requirements

- Node.js 20 or newer
- npm
- Java 17 or newer if running `lavalink/Lavalink.jar`
- Docker Desktop if running Lavalink with Docker instead of the JAR
- A Discord application and bot token
- A Discord server where you can invite the bot

Check versions:

```bash
node -v
npm -v
java -version
```

Lavalink v4 needs Java 17+. If `java -version` shows `1.8`, install JDK 17 or newer and open a new terminal.

## Discord Setup

1. Go to the Discord Developer Portal.
2. Create a new application.
3. Open **Bot** and create a bot user.
4. Copy the bot token for `DISCORD_TOKEN`.
5. Open **General Information** and copy the application ID for `DISCORD_CLIENT_ID`.
6. Invite the bot with these scopes:

```text
bot
applications.commands
```

Required bot permissions:

```text
View Channels
Send Messages
Use Slash Commands
Connect
Speak
```

For development, invite it to one test server and put that server ID in `DISCORD_GUILD_ID`. Guild commands update almost instantly. Global commands can take longer to appear.

## Installation

Install dependencies:

```bash
npm install
```

On Windows PowerShell, if script execution blocks `npm`, use:

```powershell
npm.cmd install
```

## Environment Variables

A real local `.env` file is used by the bot. It is ignored by Git so your token is not pushed to GitHub.

If `.env` is missing, copy the example:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Fill it like this:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_client_id
DISCORD_GUILD_ID=your_test_server_id

BOT_24_7_ENABLED=true
BOT_24_7_GUILD_ID=your_server_id
BOT_24_7_VOICE_CHANNEL_ID=your_voice_channel_id
BOT_24_7_TEXT_CHANNEL_ID=your_text_channel_id_for_music_messages

LAVALINK_NAME=main
LAVALINK_URL=localhost:2333
LAVALINK_AUTH=youshallnotpass
LAVALINK_SECURE=false
```

`BOT_24_7_TEXT_CHANNEL_ID` is where automatic embeds like “Now Playing” and “Queue Finished” are sent when the bot joins on startup.

## Finding Discord IDs

1. In Discord, open **User Settings**.
2. Go to **Advanced**.
3. Enable **Developer Mode**.
4. Right-click your server, voice channel, or text channel.
5. Click **Copy ID**.

## Lavalink Setup

Cloudz expects Lavalink on:

```text
localhost:2333
```

with password:

```text
youshallnotpass
```

Those values are configured in both `.env` and `lavalink/application.yml`.

### Option A: Run Lavalink With Docker

Start Lavalink:

```bash
docker compose up -d
```

Check logs:

```bash
docker compose logs -f lavalink
```

Stop Lavalink:

```bash
docker compose down
```

### Option B: Run Lavalink With JAR

Put your downloaded JAR here:

```text
lavalink/Lavalink.jar
```

Start it:

```bash
npm run lavalink:jar
```

PowerShell:

```powershell
npm.cmd run lavalink:jar
```

If you see `UnsupportedClassVersionError` with class file version `61.0`, your active Java is too old. `61.0` means Java 17. Install JDK 17+, open a new terminal, and check:

```bash
java -version
```

## Register Slash Commands

Register commands before starting the bot:

```bash
npm run deploy:commands
```

PowerShell:

```powershell
npm.cmd run deploy:commands
```

Use `DISCORD_GUILD_ID` during development for fast command updates. After the bot is stable, you can remove `DISCORD_GUILD_ID` to register global commands.

## Start The Bot

Development mode:

```bash
npm run dev
```

PowerShell:

```powershell
npm.cmd run dev
```

Production-style start:

```bash
npm run build
npm run start
```

## 24/7 Voice Mode

To keep the bot in a voice channel:

```env
BOT_24_7_ENABLED=true
BOT_24_7_GUILD_ID=your_server_id
BOT_24_7_VOICE_CHANNEL_ID=your_voice_channel_id
BOT_24_7_TEXT_CHANNEL_ID=your_text_channel_id
```

When enabled:

- The bot joins the configured VC after Discord and Lavalink are both ready.
- The bot checks the connection again every 60 seconds.
- `/stop` clears playback but keeps the bot in voice.
- Automatic playback embeds are sent to `BOT_24_7_TEXT_CHANNEL_ID`.

If you do not want 24/7 voice:

```env
BOT_24_7_ENABLED=false
```

## Commands

`/play query:<song name or URL>`

Searches SoundCloud by default or plays a direct supported URL. While typing, Discord shows autocomplete suggestions from Lavalink search. The user must be in a voice channel unless 24/7 mode has already connected the bot.

`/queue`

Shows the current track and the next 10 queued tracks in an embed.

`/skip`

Skips the current track.

`/stop`

Clears the queue and stops playback. In 24/7 mode the bot stays in voice; otherwise it leaves voice.

`/pause`

Pauses the current track.

`/resume`

Resumes playback.

`/volume amount:<1-100>`

Sets player volume.

`/help`

Shows an embedded help menu with an **All Commands** button. Press the button to get a complete command list.

## Playback Notes

The included Lavalink config enables SoundCloud search and direct HTTP audio URLs. YouTube is disabled because current Lavalink v4 deployments usually need an additional source plugin or provider configuration for reliable YouTube playback.

For seamless playback:

- Keep Lavalink running before starting the bot.
- Make sure `.env` and `lavalink/application.yml` use the same Lavalink password.
- Use Java 17+ for the JAR.
- Give the bot `Connect` and `Speak` permissions in the target voice channel.
- Keep `BOT_24_7_TEXT_CHANNEL_ID` set so background player messages have somewhere to go.
- Use direct supported URLs or SoundCloud search terms unless you add a YouTube source plugin.
- If autocomplete is empty, confirm Lavalink is running and the query has at least two characters.

## Scripts

```bash
npm run dev
```

Runs the bot with file watching.

```bash
npm run build
```

Compiles TypeScript into `dist/`.

```bash
npm run start
```

Runs the compiled bot from `dist/`.

```bash
npm run lint
```

Runs ESLint.

```bash
npm run deploy:commands
```

Registers slash commands.

```bash
npm run lavalink:jar
```

Starts `lavalink/Lavalink.jar` with `lavalink/application.yml`.

## GitHub Notes

Commit these files:

```text
src/
lavalink/application.yml
.env.example
.gitignore
.java-version
docker-compose.yml
eslint.config.js
package.json
package-lock.json
README.md
tsconfig.json
LICENSE
```

Do not commit:

```text
.env
node_modules/
dist/
lavalink/Lavalink.jar
```

`lavalink/Lavalink.jar` is a downloaded binary and is ignored by Git. Users should download it themselves and place it in `lavalink/Lavalink.jar`.

## Troubleshooting

**Slash commands do not appear**

Run `npm run deploy:commands` again. Use `DISCORD_GUILD_ID` for instant updates in one server.

**PowerShell blocks npm**

Use `npm.cmd`, for example:

```powershell
npm.cmd run dev
```

**Lavalink says class file version 61.0**

Your Java is too old. Install JDK 17 or newer and confirm `java -version` does not show `1.8`.

**Bot logs in but does not play**

Start Lavalink first, confirm the Lavalink password matches `.env`, and check that the bot can connect and speak in the voice channel.

**No search results**

The default search prefix is SoundCloud. Try a SoundCloud-friendly query or use a direct supported URL.

**No `/play` suggestions while typing**

Run `npm run deploy:commands` again after pulling the latest code. Discord only enables autocomplete after the updated slash-command schema is registered.

**24/7 voice does not connect**

Check `BOT_24_7_ENABLED`, `BOT_24_7_GUILD_ID`, and `BOT_24_7_VOICE_CHANNEL_ID`. Also confirm the bot is invited to that server and has voice permissions.
