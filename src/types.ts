import type { User } from "discord.js";

export type QueuedTrack = {
  encoded: string;
  title: string;
  uri?: string | null;
  author?: string;
  requester: User;
};
