import { Source, Track } from "@verve/gen-shared";
import { downloadSoundcloud, downloadSoundcloudMatch, importSoundcloud, isSoundcloudLink, searchSoundcloud } from "./soundcloud";
import { downloadSpotify, importSpotify, isSpotifyLink } from "./spotify";
import { Audio, LinkContents } from "./track";
import { downloadYoutube, importYoutube, isYoutubeLink, searchYoutube } from "./youtube";

export const search = (query: string, source: Source) => (source === Source.SOUNDCLOUD ? searchSoundcloud(query) : searchYoutube(query));

// null means the link isn't from a platform we know, which the caller reports differently from a failed lookup
export const importLink = (url: URL): Promise<LinkContents> | null => {
    if (isYoutubeLink(url)) return importYoutube(url);
    if (isSoundcloudLink(url)) return importSoundcloud(url);
    if (isSpotifyLink(url)) return importSpotify(url);
    return null;
};

// Tries each way of getting the audio in turn and reports the first failure, which says the most about the track
const firstThatWorks = async (attempts: (() => Promise<Audio>)[]) => {
    let firstError: unknown;
    for (const attempt of attempts) {
        try {
            return await attempt();
        } catch (error) {
            firstError ??= error;
        }
    }
    throw firstError;
};

// YouTube cuts off streams it doesn't trust after the first megabyte, so the same song from SoundCloud stands in;
// Spotify tracks have no audio of their own and go to SoundCloud first, since it's the source that reliably delivers
export const downloadAudio = (track: Track): Promise<Audio> => {
    if (track.source === Source.YOUTUBE) return firstThatWorks([() => downloadYoutube(track), () => downloadSoundcloudMatch(track)]);
    if (track.source === Source.SOUNDCLOUD) return downloadSoundcloud(track.sourceId);
    if (track.source === Source.SPOTIFY) return firstThatWorks([() => downloadSoundcloudMatch(track), () => downloadSpotify(track)]);
    return Promise.reject(new Error("Track has no source"));
};
