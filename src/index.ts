import { Client, Events, GatewayIntentBits } from "discord.js";
import { Connectors, Shoukaku } from "shoukaku";
import { config } from "./config.js";
import { MusicManager } from "./music.js";
import {
  createCommandsEmbed,
  createHelpComponents,
  createHelpEmbed,
  createStatusEmbed,
  helpCommandButtonId
} from "./ui.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), [
  {
    name: config.lavalink.name,
    url: config.lavalink.url,
    auth: config.lavalink.auth,
    secure: config.lavalink.secure
  }
]);

const music = new MusicManager(shoukaku, {
  alwaysOnGuildId: config.bot247.enabled ? config.bot247.guildId : undefined
});

let clientReady = false;
let lavalinkReady = false;

async function ensureAlwaysOnVoice(): Promise<void> {
  if (!config.bot247.enabled || !clientReady || !lavalinkReady) {
    return;
  }

  if (!config.bot247.guildId || !config.bot247.voiceChannelId) {
    console.warn(
      "BOT_24_7_ENABLED is true, but BOT_24_7_GUILD_ID or BOT_24_7_VOICE_CHANNEL_ID is missing."
    );
    return;
  }

  try {
    await music.joinAlwaysOnChannel(
      client,
      config.bot247.guildId,
      config.bot247.voiceChannelId,
      config.bot247.textChannelId
    );
    console.log("24/7 voice connection is active.");
  } catch (error) {
    console.error("Could not join the 24/7 voice channel:", error);
  }
}

client.once(Events.ClientReady, (readyClient) => {
  clientReady = true;
  console.log(`Logged in as ${readyClient.user.tag}.`);
  void ensureAlwaysOnVoice();
});

shoukaku.on("ready", (name) => {
  lavalinkReady = true;
  console.log(`Lavalink node "${name}" is ready.`);
  void ensureAlwaysOnVoice();
});

shoukaku.on("error", (name, error) => {
  console.error(`Lavalink node "${name}" error:`, error);
});

shoukaku.on("close", (name, code, reason) => {
  lavalinkReady = false;
  console.warn(`Lavalink node "${name}" closed: ${code} ${reason}`);
});

setInterval(() => {
  void ensureAlwaysOnVoice();
}, 60_000);

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    if (interaction.commandName !== "play") {
      await interaction.respond([]);
      return;
    }

    const focused = interaction.options.getFocused();

    try {
      await interaction.respond(await music.getSearchSuggestions(focused));
    } catch (error) {
      console.warn("Could not load autocomplete suggestions:", error);
      await interaction.respond([]);
    }

    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId === helpCommandButtonId) {
      await interaction.reply({
        embeds: [createCommandsEmbed()],
        ephemeral: true
      });
    }

    return;
  }

  if (!interaction.isChatInputCommand()) {
    return;
  }

  try {
    switch (interaction.commandName) {
      case "play":
        await music.play(interaction);
        break;
      case "skip":
        await music.skip(interaction);
        break;
      case "stop":
        await music.stop(interaction);
        break;
      case "queue":
        await music.showQueue(interaction);
        break;
      case "pause":
        await music.pause(interaction);
        break;
      case "resume":
        await music.resume(interaction);
        break;
      case "volume":
        await music.volume(interaction);
        break;
      case "help":
        await interaction.reply({
          embeds: [createHelpEmbed()],
          components: createHelpComponents(),
          ephemeral: true
        });
        break;
      default:
        await interaction.reply({
          embeds: [createStatusEmbed("Unknown Command", "I do not know that command.", "warning")],
          ephemeral: true
        });
    }
  } catch (error) {
    console.error(error);

    const embed = createStatusEmbed(
      "Command Failed",
      "Something went wrong while handling that command.",
      "error"
    );

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
});

await client.login(config.discordToken);
