import { Track } from "@verve/gen-shared";
import constants from "./constants";
import { downloadAudio } from "./sources";
import { Audio } from "./sources/track";

// Downloads are shared: every listener asks for the same track, so it's fetched from the platform once and kept in
// memory while it's current or next. A failed download is forgotten, so asking again retries it
const cache = new Map<string, Promise<Audio>>();

export const prepareAudio = (track: Track) => {
    let audio = cache.get(track.id);
    if (!audio) {
        audio = downloadAudio(track);
        audio.catch((error) => {
            console.error(`Downloading "${track.title}" failed:`, error);
            cache.delete(track.id);
        });
        cache.set(track.id, audio);
    }
    return audio;
};

// Drops everything but the given tracks, so memory holds a couple of songs however long the session runs
export const retainAudio = (trackIds: string[]) => {
    for (const id of cache.keys()) {
        if (!trackIds.includes(id)) cache.delete(id);
    }
};

export const getAudioChunk = async (track: Track, chunk: number) => {
    const audio = await prepareAudio(track);
    const total = Math.max(1, Math.ceil(audio.data.length / constants.audioChunkBytes));
    const start = Math.min(Math.max(chunk, 0), total - 1) * constants.audioChunkBytes;
    return { data: audio.data.subarray(start, start + constants.audioChunkBytes), total, mimeType: audio.mimeType };
};
