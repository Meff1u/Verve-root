import { Innertube } from "youtubei.js";
import { Source, Track } from "@verve/gen-shared";
import { isPlayableLength, LinkContents, makeTrack } from "./track";

type Thumbnail = { url: string; width: number };

let session: Promise<Innertube> | null = null;

// Opening a session costs a round trip to YouTube, so one is shared and only recreated after it fails. It's used for
// searching and reading links only: the player script needed for downloads costs ~280 MB of memory, more than Root's
// server allows, and YouTube cuts downloads off after the first megabyte anyway
const getSession = () => {
    session ??= Innertube.create({ retrieve_player: false }).catch((error) => {
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

export const importYoutube = async (url: URL): Promise<LinkContents> => {
    const yt = await getSession();
    const videoId = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v");
    const listId = url.searchParams.get("list");

    if (videoId) {
        const info = await yt.getBasicInfo(videoId);
        const tracks = [
            makeTrack({
                source: Source.YOUTUBE,
                sourceId: videoId,
                url: videoUrl(videoId),
                title: info.basic_info.title,
                artist: info.basic_info.author?.replace(/ - Topic$/, ""),
                duration: info.basic_info.duration ?? 0,
                coverUrl: bestThumbnail(info.basic_info.thumbnail as Thumbnail[]),
            }),
        ];
        return { title: "", tracks: tracks.filter(isPlayableLength) };
    }

    if (!listId) return { title: "", tracks: [] };
    const playlist = await yt.getPlaylist(listId);
    const tracks = playlist.videos
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
    return { title: playlist.info.title ?? "", tracks };
};
