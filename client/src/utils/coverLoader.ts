import { playerServiceClient } from "@verve/gen-client";
import { takeSlot } from "./pacing";

// Covers come from our server, since the client can't reach the platforms' image hosts. Each becomes an object URL that
// is kept for the session; a cover that failed stays failed, so a broken one isn't asked for again on every render
const covers = new Map<string, Promise<string>>();
const ready = new Map<string, string>();

const download = async (url: string) => {
    await takeSlot();
    const cover = await playerServiceClient.getCover({ url });
    const objectUrl = URL.createObjectURL(new Blob([cover.data as BlobPart], { type: cover.mimeType }));
    ready.set(url, objectUrl);
    return objectUrl;
};

export const loadCover = (url: string) => {
    let cover = covers.get(url);
    if (!cover) {
        cover = download(url);
        covers.set(url, cover);
    }
    return cover;
};

// Already loaded covers show at once, without a placeholder flashing first
export const cachedCover = (url: string) => ready.get(url);
