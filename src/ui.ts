import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

export const helpCommandButtonId = "cloudz_help_all_commands";

const brandColor = 0x5b8def;
const successColor = 0x57f287;
const warningColor = 0xfee75c;
const errorColor = 0xed4245;

export function createStatusEmbed(
  title: string,
  description: string,
  tone: "info" | "success" | "warning" | "error" = "info",
): EmbedBuilder {
  const colorByTone = {
    info: brandColor,
    success: successColor,
    warning: warningColor,
    error: errorColor,
  };

  return new EmbedBuilder()
    .setColor(colorByTone[tone])
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

export function createNowPlayingEmbed(title: string): EmbedBuilder {
  return createStatusEmbed("Now Playing", `**${title}**`, "success");
}

export function createQueueEmbed(
  currentTitle: string | undefined,
  upcomingTitles: string[],
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(brandColor)
    .setTitle("Music Queue")
    .setDescription(
      currentTitle ? `Now playing: **${currentTitle}**` : "Nothing is playing.",
    )
    .setTimestamp();

  embed.addFields({
    name: "Upcoming",
    value:
      upcomingTitles.length > 0
        ? upcomingTitles
            .map((title, index) => `**${index + 1}.** ${title}`)
            .join("\n")
        : "Queue empty.",
  });

  return embed;
}

export function createHelpEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(brandColor)
    .setTitle("Cloudz Help")
    .setDescription(
      "Use the button below to view every command. Start with `/play` after joining a voice channel, or enable 24/7 voice in `.env`.",
    )
    .addFields(
      {
        name: "Playback",
        value: "`/play`, `/pause`, `/resume`, `/skip`, `/stop`",
      },
      {
        name: "Queue",
        value: "`/queue`, `/volume`",
      },
    )
    .setTimestamp();
}

export function createCommandsEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(brandColor)
    .setTitle("All Commands")
    .setDescription("Every available slash command for Cloudz.")
    .addFields(
      {
        name: "/play query:<song name or URL>",
        value: "Searches YouTube (preferred) or SoundCloud. Spotify URLs are resolved to YouTube results.",
      },
      {
        name: "/queue",
        value: "Shows the current track and the next 10 queued tracks.",
      },
      {
        name: "/skip",
        value: "Skips the current track and starts the next one.",
      },
      {
        name: "/stop",
        value:
          "Clears playback. In 24/7 mode the bot stays in voice; otherwise it leaves.",
      },
      {
        name: "/pause",
        value: "Pauses the current track.",
      },
      {
        name: "/resume",
        value: "Resumes paused playback.",
      },
      {
        name: "/volume amount:<1-100>",
        value: "Sets the player volume.",
      },
      {
        name: "/help",
        value: "Shows help and the command-list button.",
      },
    )
    .setTimestamp();
}

export function createHelpComponents() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(helpCommandButtonId)
        .setLabel("All Commands")
        .setStyle(ButtonStyle.Primary),
    ),
  ];
}
