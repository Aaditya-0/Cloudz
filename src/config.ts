import "dotenv/config";

function readRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

export const config = {
  discordToken: readRequiredEnv("DISCORD_TOKEN"),
  discordClientId: readRequiredEnv("DISCORD_CLIENT_ID"),
  discordGuildId: process.env.DISCORD_GUILD_ID,
  // Search provider: 'yt' (YouTube), 'sc' (SoundCloud), or 'auto'
  searchProvider: process.env.SEARCH_PROVIDER ?? "yt",
  // Optional Spotify API credentials for resolving Spotify URLs to search queries
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  bot247: {
    enabled: readBooleanEnv("BOT_24_7_ENABLED", false),
    guildId: process.env.BOT_24_7_GUILD_ID,
    voiceChannelId: process.env.BOT_24_7_VOICE_CHANNEL_ID,
    textChannelId: process.env.BOT_24_7_TEXT_CHANNEL_ID
  },
  lavalink: {
    name: process.env.LAVALINK_NAME ?? "main",
    url: process.env.LAVALINK_URL ?? "localhost:2333",
    auth: process.env.LAVALINK_AUTH ?? "youshallnotpass",
    secure: readBooleanEnv("LAVALINK_SECURE", false)
  }
};
