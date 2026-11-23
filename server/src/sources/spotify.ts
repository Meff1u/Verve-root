import type { SpotifyUrlInfo } from "spotify-url-info";
import { Source, Track } from "@verve/gen-shared";
import constants from "../constants";
import { Audio, isPlayableLength, makeTrack, matchesTitle } from "./track";
import { downloadYoutube, searchYoutube } from "./youtube";

// The package's type file declares its export as a type only, so the function itself comes in through require
const spotify: SpotifyUrlInfo = require("spotify-url-info")(fetch);

export const isSpotifyLink = (url: URL) => url.hostname === "open.spotify.com";

// Spotify's public embed pages give names, artists and durations for tracks, albums and playlists without an API key
export const importSpotify = async (url: URL): Promise<Track[]> => {
    const link = `https://open.spotify.com${url.pathname.replace(/^\/intl-[a-z]+/, "")}`;
    const [tracks, preview] = await Promise.all([spotify.getTracks(link), spotify.getPreview(link).catch(() => null)]);
    const single = tracks.length === 1;

    return tracks
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
};

// Spotify has no audio for us, so the track is looked up on YouTube Music: only results with the same title and
// about the same length count, closest length first; with no such result the track is skipped, not swapped for another
export const downloadSpotify = async (track: Track): Promise<Audio> => {
    const candidates = (await searchYoutube(`${track.artist} ${track.title}`))
        .slice(0, constants.spotifyMatchCandidates)
        .filter((candidate) => matchesTitle(track.title, candidate.title))
        .filter((candidate) => !track.duration || !candidate.duration || Math.abs(candidate.duration - track.duration) <= constants.matchToleranceSeconds)
        .sort((a, b) => Math.abs(a.duration - track.duration) - Math.abs(b.duration - track.duration));
    if (!candidates.length) throw new Error(`No YouTube match for ${track.artist} - ${track.title}`);

    let lastError: unknown;
    for (const match of candidates.slice(0, 2)) {
        try {
            const audio = await downloadYoutube(match);
            return { ...audio, details: { coverUrl: track.coverUrl || match.coverUrl, album: track.album || match.album } };
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
};
