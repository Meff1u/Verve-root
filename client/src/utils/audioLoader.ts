import { playerServiceClient } from "@verve/gen-client";
import constants from "../constants";
import { takeSlot, wait } from "./pacing";

type ProgressListener = (trackId: string, progress: number) => void;

// The client can't reach YouTube or SoundCloud itself, so audio comes from our server in chunks and becomes an object
// URL for <audio>; a complete file in memory also seeks reliably on every platform, Android included
const loaded = new Map<string, Promise<string>>();
const listeners = new Set<ProgressListener>();

// A refused chunk (rate limit, a hiccup) is simply asked for again a bit later
const fetchChunk = async (trackId: string, chunk: number) => {
    for (let attempt = 0; ; attempt++) {
        try {
            await takeSlot();
            return await playerServiceClient.getAudio({ trackId, chunk });
        } catch (error) {
            if (attempt >= constants.chunkRetries) throw error;
            await wait(constants.chunkRetryDelay * (attempt + 1));
        }
    }
};

const download = async (trackId: string) => {
    const first = await fetchChunk(trackId, 0);
    const parts = [first.data];
    listeners.forEach((listener) => listener(trackId, 1 / first.total));

    for (let chunk = 1; chunk < first.total; chunk++) {
        parts.push((await fetchChunk(trackId, chunk)).data);
        listeners.forEach((listener) => listener(trackId, (chunk + 1) / first.total));
    }
    return URL.createObjectURL(new Blob(parts as BlobPart[], { type: first.mimeType }));
};

export const loadAudio = (trackId: string) => {
    let url = loaded.get(trackId);
    if (!url) {
        url = download(trackId);
        url.catch(() => loaded.delete(trackId));
        loaded.set(trackId, url);
    }
    return url;
};

// Frees every track but the ones still needed, since each holds a few megabytes of audio
export const releaseAudio = (keep: string[]) => {
    for (const [trackId, url] of loaded) {
        if (keep.includes(trackId)) continue;
        loaded.delete(trackId);
        url.then(URL.revokeObjectURL, () => {});
    }
};

export const onAudioProgress = (listener: ProgressListener) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
