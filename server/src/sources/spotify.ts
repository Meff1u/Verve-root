import type { SpotifyUrlInfo } from "spotify-url-info";
import { Source, Track } from "@verve/gen-shared";
import { isPlayableLength, LinkContents, makeTrack } from "./track";

// The package's type file declares its export as a type only, so the function itself comes in through require
const spotify: SpotifyUrlInfo = require("spotify-url-info")(fetch);

export const isSpotifyLink = (url: URL) => url.hostname === "open.spotify.com";

// Spotify's public embed pages give names, artists and durations for tracks, albums and playlists without an API key
export const importSpotify = async (url: URL): Promise<LinkContents> => {
    const link = `https://open.spotify.com${url.pathname.replace(/^\/intl-[a-z]+/, "")}`;
    const [items, preview] = await Promise.all([spotify.getTracks(link), spotify.getPreview(link).catch(() => null)]);
    const single = items.length === 1;

    const tracks = items
        .map((track) =>
            makeTrack({
                source: Source.SPOTIFY,
                sourceId: track.uri,
                url: `https://open.spotify.com/track/${track.uri.split(":").pop()}`,
                title: track.name,
                artist: track.artist,
                duration: (track.duration ?? 0) / 1000,
                // A playlist's picture isn't the track's cover, so only a single track borrows it
                coverUrl: single ? (preview?.image ?? "") : "",
            }),
        )
        .filter(isPlayableLength);
    return { title: single ? "" : (preview?.title ?? ""), tracks };
};
