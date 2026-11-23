import { Source, Track } from "@verve/gen-shared";
import constants from "../constants";

// What a link points to: the playlist or album name (empty for a single track) and its tracks
export type LinkContents = {
    title: string;
    tracks: Track[];
};

export type Audio = {
    data: Buffer;
    mimeType: string;
    // Filled in when a source learns more than the queue knew, e.g. a Spotify track matched on YouTube gets a cover
    details?: Partial<Track>;
};

export const emptyTrack: Track = {
    id: "",
    url: "",
    title: "",
    addedBy: "",
    artist: "",
    album: "",
    year: 0,
    coverUrl: "",
    duration: 0,
    source: Source.UNSPECIFIED,
    sourceId: "",
};

export const makeTrack = (fields: Partial<Track>): Track => ({
    ...emptyTrack,
    ...fields,
    title: (fields.title || "Untitled").slice(0, constants.maxTitleLength),
    artist: (fields.artist || "").slice(0, constants.maxTitleLength),
});

const normalize = (text: string) =>
    text
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();

const ignoredWords = new Set(["feat", "ft", "prod", "official", "video", "audio", "lyrics", "lyric", "music", "remastered", "version"]);

// Is the candidate the same song? Every meaningful word of the title must appear in it; bracketed extras and
// "- Remastered 2011" style suffixes are left out, because platforms write them differently. Length alone isn't
// enough: an artist's other songs often run just as long, and playing one of those is worse than skipping
export const matchesTitle = (title: string, candidate: string) => {
    const core = title.replace(/\([^)]*\)|\[[^\]]*\]/g, " ").replace(/\s[-–—]\s.*$/, "");
    const words = normalize(core || title)
        .split(" ")
        .filter((word) => word.length > 1 && !ignoredWords.has(word));
    const haystack = ` ${normalize(candidate)} `;
    return words.length > 0 && words.every((word) => haystack.includes(` ${word} `));
};

// Hour-long mixes would fill the server's memory and take ages to send, so they're left out of results and imports
export const isPlayableLength = (track: Track) => !track.duration || track.duration <= constants.maxTrackSeconds;

// Reads a whole web stream into one buffer, refusing anything that grows past the limit
export const collect = async (stream: ReadableStream<Uint8Array>) => {
    const parts: Uint8Array[] = [];
    let size = 0;
    const reader = stream.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        size += value.length;
        if (size > constants.maxAudioBytes) {
            await reader.cancel();
            throw new Error("Audio is larger than the limit");
        }
        parts.push(value);
    }
    return Buffer.concat(parts);
};

export const fetchBuffer = async (url: string, headers?: Record<string, string>) => {
    const response = await fetch(url, { headers });
    if (!response.ok || !response.body) throw new Error(`Download failed with status ${response.status}`);
    return collect(response.body);
};
