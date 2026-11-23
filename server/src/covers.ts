import constants from "./constants";

type Cover = { data: Buffer; mimeType: string };

// The client has no network of its own, so cover images come through the server. Only the platforms' image hosts are
// fetched, so the server can't be used to reach anything else; covers are kept, since every listener asks for the same
const cache = new Map<string, Promise<Cover>>();

const isCoverHost = (hostname: string) => constants.coverHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));

const fetchCover = async (url: string): Promise<Cover> => {
    const link = new URL(url);
    if (link.protocol !== "https:" || !isCoverHost(link.hostname)) throw new Error(`Not a cover host: ${link.hostname}`);

    const response = await fetch(link, { signal: AbortSignal.timeout(constants.coverTimeoutMs) });
    const mimeType = response.headers.get("content-type") ?? "";
    if (!response.ok || !mimeType.startsWith("image/")) throw new Error(`Cover download failed with status ${response.status}`);

    const data = Buffer.from(await response.arrayBuffer());
    if (data.length > constants.maxCoverBytes) throw new Error(`Cover too big (${data.length} bytes)`);
    return { data, mimeType };
};

export const getCover = (url: string) => {
    let cover = cache.get(url);
    if (!cover) {
        cover = fetchCover(url);
        cover.catch(() => cache.delete(url));
        cache.set(url, cover);
        // The oldest cover goes first once the cache is full; a Map keeps insertion order
        if (cache.size > constants.maxCachedCovers) cache.delete(cache.keys().next().value!);
    }
    return cover;
};
