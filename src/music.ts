import type {
  ChatInputCommandInteraction,
  Client,
  TextBasedChannel
} from "discord.js";
import { GuildMember as GuildMemberClass } from "discord.js";
import { LoadType } from "shoukaku";
import type { LavalinkResponse, Player, Shoukaku, Track } from "shoukaku";
import type { QueuedTrack } from "./types.js";
import {
  createNowPlayingEmbed,
  createQueueEmbed,
  createStatusEmbed,
} from "./ui.js";
import { config } from "./config.js";
import { isSpotifyUrl, resolveSpotifyUrlToQueries } from "./spotify.js";

type SendableTextChannel = TextBasedChannel & {
  send(options: unknown): Promise<unknown>;
};

type GuildQueue = {
  player: Player;
  textChannel?: SendableTextChannel;
  tracks: QueuedTrack[];
  current?: QueuedTrack;
  volume: number;
  leaving: boolean;
};

type MusicManagerOptions = {
  alwaysOnGuildId?: string;
};

export class MusicManager {
  private readonly queues = new Map<string, GuildQueue>();

  public constructor(
    private readonly shoukaku: Shoukaku,
    private readonly options: MusicManagerOptions = {},
  ) {}

  public async joinAlwaysOnChannel(
    client: Client,
    guildId: string,
    voiceChannelId: string,
    textChannelId?: string,
  ): Promise<void> {
    const guild = await client.guilds.fetch(guildId);
    const textChannel = textChannelId
      ? await this.fetchSendableTextChannel(client, textChannelId)
      : undefined;

    await this.getOrCreateQueue({
      guildId,
      channelId: voiceChannelId,
      shardId: guild.shardId,
      textChannel,
    });
  }

  public async getSearchSuggestions(query: string): Promise<
    Array<{
      name: string;
      value: string;
    }>
  > {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2 || /^https?:\/\//i.test(trimmedQuery)) {
      return [];
    }

    const prefix = this.getProviderPrefix();
    const result = await this.search(`${prefix}${trimmedQuery}`);
    const tracks = this.getTracks(result).slice(0, 10);

    return tracks.map((track) => ({
      name: this.truncateChoiceText(
        `${track.info.title}${track.info.author ? ` - ${track.info.author}` : ""}`,
      ),
      value: this.truncateChoiceText(track.info.uri ?? track.info.title),
    }));
  }

  public async play(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({
        embeds: [
          createStatusEmbed(
            "Server Only",
            "This command can only be used in a server.",
            "warning",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const member = interaction.member;

    if (!(member instanceof GuildMemberClass)) {
      await interaction.reply({
        embeds: [
          createStatusEmbed(
            "Voice Channel Missing",
            "I could not read your voice channel. Try again in a server.",
            "warning",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      await interaction.reply({
        embeds: [
          createStatusEmbed(
            "Join Voice First",
            "Join a voice channel first, then use `/play`.",
            "warning",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const query = interaction.options.getString("query", true);
    let tracks: Track[] = [];

    // If the user provided a Spotify URL and creds are configured, resolve to YouTube search queries
    if (isSpotifyUrl(query)) {
      const queries = await resolveSpotifyUrlToQueries(query, 25);
      for (const q of queries) {
        const r = await this.search(`${this.getProviderPrefix()}${q}`);
        tracks.push(...this.getTracks(r));
        if (tracks.length >= 25) break;
      }
    } else {
      const r = await this.search(`${this.getProviderPrefix()}${query}`);
      tracks = this.getTracks(r);
    }

    if (tracks.length === 0) {
      await interaction.editReply({
        embeds: [
          createStatusEmbed("No Results", "No tracks found.", "warning"),
        ],
      });
      return;
    }

    const textChannel = interaction.channel;

    if (!this.isSendableTextChannel(textChannel)) {
      await interaction.editReply({
        embeds: [
          createStatusEmbed(
            "Text Channel Required",
            "This command must be used in a text-based server channel.",
            "warning",
          ),
        ],
      });
      return;
    }

    const queue = await this.getOrCreateQueue({
      guildId: interaction.guildId,
      channelId: voiceChannel.id,
      shardId: member.guild.shardId,
      textChannel,
    });

    const addedTracks =
      tracks.length > 1 ? tracks.slice(0, 25) : tracks.slice(0, 1);

    queue.tracks.push(
      ...addedTracks.map((track: Track) =>
        this.toQueuedTrack(track, interaction.user),
      ),
    );

    if (!queue.current) {
      await this.startNext(interaction.guildId);
    }

    const [firstTrack] = addedTracks;
    const description =
      addedTracks.length > 1
        ? `Added **${addedTracks.length}** tracks to the queue.`
        : `Queued **${firstTrack.info.title}**.`;

    await interaction.editReply({
      embeds: [createStatusEmbed("Queued", description, "success")],
    });
  }

  public async skip(interaction: ChatInputCommandInteraction): Promise<void> {
    const queue = this.requireQueue(interaction);

    if (!queue) {
      return;
    }

    await interaction.reply({
      embeds: [
        createStatusEmbed("Skipped", "Skipping current track.", "success"),
      ],
    });
    await queue.player.stopTrack();
  }

  public async stop(interaction: ChatInputCommandInteraction): Promise<void> {
    const queue = this.requireQueue(interaction);

    if (!queue || !interaction.guildId) {
      return;
    }

    queue.tracks = [];
    queue.current = undefined;
    await queue.player.stopTrack();

    if (this.isAlwaysOnGuild(interaction.guildId)) {
      await interaction.reply({
        embeds: [
          createStatusEmbed(
            "Stopped",
            "Stopped playback and cleared the queue.",
            "success",
          ),
        ],
      });
      return;
    }

    queue.leaving = true;
    await this.shoukaku.leaveVoiceChannel(interaction.guildId);
    this.queues.delete(interaction.guildId);
    await interaction.reply({
      embeds: [
        createStatusEmbed(
          "Stopped",
          "Stopped playback, cleared the queue, and left voice.",
          "success",
        ),
      ],
    });
  }

  public async pause(interaction: ChatInputCommandInteraction): Promise<void> {
    const queue = this.requireQueue(interaction);

    if (!queue) {
      return;
    }

    await queue.player.setPaused(true);
    await interaction.reply({
      embeds: [createStatusEmbed("Paused", "Paused playback.", "success")],
    });
  }

  public async resume(interaction: ChatInputCommandInteraction): Promise<void> {
    const queue = this.requireQueue(interaction);

    if (!queue) {
      return;
    }

    await queue.player.setPaused(false);
    await interaction.reply({
      embeds: [createStatusEmbed("Resumed", "Resumed playback.", "success")],
    });
  }

  public async volume(interaction: ChatInputCommandInteraction): Promise<void> {
    const queue = this.requireQueue(interaction);

    if (!queue) {
      return;
    }

    const amount = interaction.options.getInteger("amount", true);
    queue.volume = amount;
    await queue.player.setGlobalVolume(amount);
    await interaction.reply({
      embeds: [
        createStatusEmbed(
          "Volume Updated",
          `Volume set to **${amount}%**.`,
          "success",
        ),
      ],
    });
  }

  public async showQueue(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const queue = this.requireQueue(interaction);

    if (!queue) {
      return;
    }

    const upcoming = queue.tracks.slice(0, 10).map((track) => track.title);

    await interaction.reply({
      embeds: [createQueueEmbed(queue.current?.title, upcoming)],
    });
  }

  private async getOrCreateQueue(options: {
    guildId: string;
    channelId: string;
    shardId: number;
    textChannel?: SendableTextChannel;
  }): Promise<GuildQueue> {
    const { guildId, channelId, shardId, textChannel } = options;
    const existing = this.queues.get(guildId);

    if (existing) {
      if (textChannel) {
        existing.textChannel = textChannel;
      }

      return existing;
    }

    const player = await this.shoukaku.joinVoiceChannel({
      guildId,
      channelId,
      shardId,
      deaf: true,
    });

    const queue: GuildQueue = {
      player,
      textChannel,
      tracks: [],
      volume: 80,
      leaving: false,
    };

    player.on("end", () => {
      void this.startNext(guildId);
    });

    player.on("closed", () => {
      if (!queue.leaving) {
        this.queues.delete(guildId);
      }
    });

    player.on("exception", (data) => {
      void this.sendQueueEmbed(
        queue,
        createStatusEmbed("Playback Error", data.exception.message, "error"),
      );
      void this.startNext(guildId);
    });

    player.on("stuck", () => {
      void this.sendQueueEmbed(
        queue,
        createStatusEmbed(
          "Track Stuck",
          "Track got stuck. Skipping.",
          "warning",
        ),
      );
      void this.startNext(guildId);
    });

    await player.setGlobalVolume(queue.volume);
    this.queues.set(guildId, queue);

    return queue;
  }

  private async startNext(guildId: string): Promise<void> {
    const queue = this.queues.get(guildId);

    if (!queue || queue.leaving) {
      return;
    }

    const next = queue.tracks.shift();

    if (!next) {
      queue.current = undefined;
      await this.sendQueueEmbed(
        queue,
        createStatusEmbed("Queue Finished", "Queue finished.", "info"),
      );
      return;
    }

    queue.current = next;
    await queue.player.playTrack({ track: { encoded: next.encoded } });
    await this.sendQueueEmbed(queue, createNowPlayingEmbed(next.title));
  }

  private requireQueue(
    interaction: ChatInputCommandInteraction,
  ): GuildQueue | undefined {
    if (!interaction.guildId) {
      void interaction.reply({
        embeds: [
          createStatusEmbed(
            "Server Only",
            "This command can only be used in a server.",
            "warning",
          ),
        ],
        ephemeral: true,
      });
      return undefined;
    }

    const queue = this.queues.get(interaction.guildId);

    if (!queue) {
      void interaction.reply({
        embeds: [
          createStatusEmbed(
            "Nothing Playing",
            "Nothing is playing right now.",
            "warning",
          ),
        ],
        ephemeral: true,
      });
      return undefined;
    }

    return queue;
  }

  private resolveSearchQuery(query: string): string {
    if (/^https?:\/\//i.test(query)) {
      return query;
    }

    return `${this.getProviderPrefix()}${query}`;
  }

  private getProviderPrefix(): string {
    switch (config.searchProvider) {
      case "sc":
        return "scsearch:";
      case "yt":
      default:
        return "ytmsearch:";
    }
  }

  private toQueuedTrack(track: Track, requester: QueuedTrack["requester"]) {
    return {
      encoded: track.encoded,
      title: track.info.title,
      uri: track.info.uri,
      author: track.info.author,
      requester,
    };
  }

  private async search(query: string): Promise<LavalinkResponse | undefined> {
    const node = this.shoukaku.getIdealNode();

    if (!node) {
      throw new Error("No Lavalink node is currently available.");
    }

    return node.rest.resolve(query);
  }

  private getTracks(result: LavalinkResponse | undefined): Track[] {
    if (!result) {
      return [];
    }

    switch (result.loadType) {
      case LoadType.TRACK:
        return [result.data];
      case LoadType.PLAYLIST:
        return result.data.tracks;
      case LoadType.SEARCH:
        return result.data;
      case LoadType.EMPTY:
      case LoadType.ERROR:
        return [];
    }
  }

  private isSendableTextChannel(
    channel: unknown,
  ): channel is SendableTextChannel {
    return Boolean(
      channel &&
      typeof channel === "object" &&
      "send" in channel &&
      typeof channel.send === "function",
    );
  }

  private async fetchSendableTextChannel(
    client: Client,
    channelId: string,
  ): Promise<SendableTextChannel | undefined> {
    const channel = await client.channels.fetch(channelId);

    return this.isSendableTextChannel(channel) ? channel : undefined;
  }

  private async sendQueueEmbed(
    queue: GuildQueue,
    embed: ReturnType<typeof createStatusEmbed>,
  ): Promise<void> {
    await queue.textChannel?.send({ embeds: [embed] });
  }

  private isAlwaysOnGuild(guildId: string): boolean {
    return this.options.alwaysOnGuildId === guildId;
  }

  private truncateChoiceText(text: string): string {
    return text.length > 100 ? `${text.slice(0, 97)}...` : text;
  }
}
