import vm from "vm";
import { Innertube, Platform } from "youtubei.js";
import { Source, Track } from "@verve/gen-shared";
import constants from "../constants";
import { Audio, collect, isPlayableLength, makeTrack } from "./track";

type Thumbnail = { url: string; width: number };

// Stream URLs are scrambled by a function inside YouTube's player script, and youtubei.js asks us to run it.
// It runs in an empty vm context with a time limit, so the script can't reach the server's code, files or network
Platform.shim.eval = (data) => vm.runInNewContext(`(function () {\n${data.output}\n})()`, { URL, URLSearchParams }, { timeout: constants.youtubeEvalTimeoutMs });

let session: Promise<Innertube> | null = null;

// Opening a session costs a round trip to YouTube, so one is shared and only recreated after it fails
const getSession = () => {
    session ??= Innertube.create({ retrieve_player: true }).catch((error) => {
        session = null;
        throw error;
    });
    return session;
};

// YouTube Music thumbnails come tiny (w60) but the URL can ask for any size
const bestThumbnail = (thumbnails: Thumbnail[] | undefined) => {
    const best = [...(thumbnails ?? [])].sort((a, b) => b.width - a.width)[0];
    return best ? best.url.replace(/=w\d+-h\d+/, "=w544-h544") : "";
};

const videoUrl = (id: string) => `https://music.youtube.com/watch?v=${id}`;

export const searchYoutube = async (query: string): Promise<Track[]> => {
    const yt = await getSession();
    const results = await yt.music.search(query, { type: "song" });

    return (results.songs?.contents ?? [])
        .filter((song) => song.id)
        .map((song) =>
            makeTrack({
                source: Source.YOUTUBE,
                sourceId: song.id,
                url: videoUrl(song.id!),
                title: song.title,
                artist: song.artists?.map((artist) => artist.name).join(", "),
                album: song.album?.name,
                duration: song.duration?.seconds ?? 0,
                coverUrl: bestThumbnail(song.thumbnails as Thumbnail[]),
            }),
        )
        .filter(isPlayableLength);
};

// Accepts youtube.com, music.youtube.com, m.youtube.com and youtu.be links to a video or a playlist
export const isYoutubeLink = (url: URL) => /(^|\.)youtube\.com$|^youtu\.be$/.test(url.hostname);

export const importYoutube = async (url: URL): Promise<Track[]> => {
    const yt = await getSession();
    const videoId = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v");
    const listId = url.searchParams.get("list");

    if (videoId) {
        const info = await yt.getBasicInfo(videoId);
        return [
            makeTrack({
                source: Source.YOUTUBE,
                sourceId: videoId,
                url: videoUrl(videoId),
                title: info.basic_info.title,
                artist: info.basic_info.author?.replace(/ - Topic$/, ""),
                duration: info.basic_info.duration ?? 0,
                coverUrl: bestThumbnail(info.basic_info.thumbnail as Thumbnail[]),
            }),
        ].filter(isPlayableLength);
    }

    if (!listId) return [];
    const playlist = await yt.getPlaylist(listId);
    return playlist.videos
        .map((video) => {
            const item = video as unknown as { id: string; title: { text?: string }; author?: { name: string }; duration?: { seconds: number }; thumbnails?: Thumbnail[] };
            return makeTrack({
                source: Source.YOUTUBE,
                sourceId: item.id,
                url: videoUrl(item.id),
                title: item.title?.text,
                artist: item.author?.name?.replace(/ - Topic$/, ""),
                duration: item.duration?.seconds ?? 0,
                coverUrl: bestThumbnail(item.thumbnails),
            });
        })
        .filter((track) => track.sourceId && isPlayableLength(track));
};

// YouTube refuses different clients at different times, so each is tried in turn, and once more with a fresh session
// in case the old one went stale
const downloadVideo = async (videoId: string): Promise<Audio> => {
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt++) {
        const yt = await getSession();
        for (const client of constants.youtubeClients) {
            try {
                const stream = await yt.download(videoId, { type: "audio", quality: "best", format: "mp4", client });
                return { data: await collect(stream), mimeType: "audio/mp4" };
            } catch (error) {
                lastError = error;
            }
        }
        session = null;
    }
    throw lastError;
};

// Other uploads of the same song (official video, lyric video, topic channel) with about the same length
const findAlternatives = async (track: Track) => {
    const yt = await getSession();
    const results = await yt.search(`${track.artist} ${track.title}`, { type: "video" });
    const videos = (results.videos ?? []) as unknown as { id?: string; duration?: { seconds: number } }[];

    return videos
        .filter((video) => video.id && video.id !== track.sourceId)
        .filter((video) => !track.duration || Math.abs((video.duration?.seconds ?? 0) - track.duration) <= constants.matchToleranceSeconds)
        .map((video) => video.id!)
        .slice(0, constants.youtubeAlternatives);
};

// Some songs are refused outright, so when the chosen video can't be fetched another upload of the same song stands in
export const downloadYoutube = async (track: Track): Promise<Audio> => {
    try {
        return await downloadVideo(track.sourceId);
    } catch (error) {
        for (const videoId of await findAlternatives(track).catch(() => [])) {
            try {
                return await downloadVideo(videoId);
            } catch {}
        }
        throw error;
    }
};
