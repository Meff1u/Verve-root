import Soundcloud, { SoundcloudTrack } from "soundcloud.ts";
import { Source, Track } from "@verve/gen-shared";
import { Audio, fetchBuffer, isPlayableLength, makeTrack } from "./track";

const soundcloud = new Soundcloud();

type Transcoding = SoundcloudTrack["media"]["transcodings"][number];

// Label releases come only as encrypted (DRM) streams, which can't be played outside SoundCloud's own player
const playableTranscoding = (track: SoundcloudTrack): Transcoding | undefined => {
    const transcodings = track.media?.transcodings ?? [];
    return (
        transcodings.find((t) => t.format.protocol === "progressive") ??
        transcodings.find((t) => t.format.protocol === "hls" && t.format.mime_type.startsWith("audio/mp4")) ??
        transcodings.find((t) => t.format.protocol === "hls" && t.format.mime_type.startsWith("audio/mpeg"))
    );
};

const toTrack = (track: SoundcloudTrack) =>
    makeTrack({
        source: Source.SOUNDCLOUD,
        sourceId: String(track.id),
        url: track.permalink_url,
        title: track.title,
        artist: track.user?.username,
        duration: (track.duration ?? 0) / 1000,
        coverUrl: (track.artwork_url || track.user?.avatar_url || "").replace("-large", "-t500x500"),
    });

export const searchSoundcloud = async (query: string): Promise<Track[]> => {
    const results = await soundcloud.tracks.search({ q: query, limit: 40 });
    return results.collection
        .filter((track) => playableTranscoding(track))
        .map(toTrack)
        .filter(isPlayableLength)
        .slice(0, 20);
};

export const isSoundcloudLink = (url: URL) => /(^|\.)soundcloud\.com$/.test(url.hostname);

export const importSoundcloud = async (url: URL): Promise<Track[]> => {
    const link = `https://soundcloud.com${url.pathname}`;
    if (url.pathname.includes("/sets/")) {
        const playlist = await soundcloud.playlists.get(link);
        return playlist.tracks.filter((track) => track.title && playableTranscoding(track)).map(toTrack).filter(isPlayableLength);
    }
    return [await soundcloud.tracks.get(link)].filter((track) => playableTranscoding(track)).map(toTrack).filter(isPlayableLength);
};

// HLS is turned into one file without ffmpeg: AAC streams are fragmented MP4 (init segment + parts), MP3 ones just concatenate
const downloadHls = async (playlistUrl: string) => {
    const playlist = await (await fetch(playlistUrl)).text();
    const init = playlist.match(/#EXT-X-MAP:URI="([^"]+)"/)?.[1];
    const segments = playlist.split("\n").filter((line) => line.trim() && !line.startsWith("#"));

    const parts: Buffer[] = [];
    for (const url of init ? [init, ...segments] : segments) parts.push(await fetchBuffer(url));
    return Buffer.concat(parts);
};

export const downloadSoundcloud = async (trackId: string): Promise<Audio> => {
    const track = await soundcloud.tracks.get(Number(trackId));
    const transcoding = playableTranscoding(track);
    if (!transcoding) throw new Error("No playable stream for this track");

    const clientId = await soundcloud.api.getClientId();
    const auth = track.track_authorization ? `&track_authorization=${track.track_authorization}` : "";
    const response = await fetch(`${transcoding.url}?client_id=${clientId}${auth}`, { headers: soundcloud.api.headers });
    const { url } = (await response.json()) as { url?: string };
    if (!url) throw new Error(`SoundCloud refused the stream (${response.status})`);

    const mimeType = transcoding.format.mime_type.startsWith("audio/mp4") ? "audio/mp4" : "audio/mpeg";
    const data = transcoding.format.protocol === "hls" ? await downloadHls(url) : await fetchBuffer(url);
    return { data, mimeType };
};
