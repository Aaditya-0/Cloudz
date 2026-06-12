import { SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a track or add it to the queue.")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("A song name, search terms, or direct URL.")
        .setAutocomplete(true)
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current track."),
  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop playback, clear the queue, and leave voice."),
  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current queue."),
  new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause playback."),
  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume playback."),
  new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Set playback volume.")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Volume from 1 to 100.")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show bot help and command details.")
].map((command) => command.toJSON());
