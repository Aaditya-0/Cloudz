import { config } from "./config.js";

type SpotifyToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

function isSpotifyUrl(url: string): boolean {
  return /(?:open\.)?spotify\.com\/.+/.test(url) || /spotify:\w+:/.test(url);
}

async function getSpotifyToken(): Promise<string | null> {
  if (!config.spotifyClientId || !config.spotifyClientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const creds = Buffer.from(`${config.spotifyClientId}:${config.spotifyClientSecret}`).toString("base64");

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!resp.ok) return null;

  const data = (await resp.json()) as SpotifyToken;

  const expiresAt = Date.now() + (data.expires_in - 30) * 1000;
  cachedToken = { token: data.access_token, expiresAt };

  return data.access_token;
}

function extractSpotifyId(url: string): { type: string; id: string } | null {
  // open.spotify.com/track/{id}
  const m = url.match(/(?:open\.)?spotify\.com\/(track|playlist|album)\/(\w+)/i);
  if (m) return { type: m[1], id: m[2] };

  // spotify:track:{id}
  const n = url.match(/spotify:(track|playlist|album):(\w+)/i);
  if (n) return { type: n[1], id: n[2] };

  return null;
}

export async function resolveSpotifyUrlToQueries(url: string, max = 25): Promise<string[]> {
  const idInfo = extractSpotifyId(url);
  if (!idInfo) return [];

  const token = await getSpotifyToken();
  if (!token) return [];

  const headers = { Authorization: `Bearer ${token}` };

  if (idInfo.type === "track") {
    const r = await fetch(`https://api.spotify.com/v1/tracks/${idInfo.id}`, { headers });
    if (!r.ok) return [];
    const d = await r.json();
    const name = d.name as string;
    const artist = Array.isArray(d.artists) && d.artists[0] ? d.artists[0].name : "";
    return [`${artist} - ${name}`];
  }

  if (idInfo.type === "playlist") {
    const q: string[] = [];
    let offset = 0;
    while (q.length < max) {
      const limit = Math.min(100, max - q.length);
      const r = await fetch(
        `https://api.spotify.com/v1/playlists/${idInfo.id}/tracks?offset=${offset}&limit=${limit}`,
        { headers }
      );
      if (!r.ok) break;
      const d = await r.json();
      const items = d.items || [];
      for (const it of items) {
        const t = it.track;
        if (!t) continue;
        const name = t.name as string;
        const artist = Array.isArray(t.artists) && t.artists[0] ? t.artists[0].name : "";
        q.push(`${artist} - ${name}`);
        if (q.length >= max) break;
      }
      if (items.length < limit) break;
      offset += items.length;
    }
    return q;
  }

  if (idInfo.type === "album") {
    const q: string[] = [];
    let offset = 0;
    while (q.length < max) {
      const limit = Math.min(50, max - q.length);
      const r = await fetch(`https://api.spotify.com/v1/albums/${idInfo.id}/tracks?offset=${offset}&limit=${limit}`, { headers });
      if (!r.ok) break;
      const d = await r.json();
      const items = d.items || [];
      for (const t of items) {
        const name = t.name as string;
        const artist = Array.isArray(t.artists) && t.artists[0] ? t.artists[0].name : "";
        q.push(`${artist} - ${name}`);
        if (q.length >= max) break;
      }
      if (items.length < limit) break;
      offset += items.length;
    }
    return q;
  }

  return [];
}

export { isSpotifyUrl };
