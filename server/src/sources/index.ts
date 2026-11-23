import { Source, Track } from "@verve/gen-shared";
import { downloadSoundcloud, importSoundcloud, isSoundcloudLink, searchSoundcloud } from "./soundcloud";
import { downloadSpotify, importSpotify, isSpotifyLink } from "./spotify";
import { Audio } from "./track";
import { downloadYoutube, importYoutube, isYoutubeLink, searchYoutube } from "./youtube";

export const search = (query: string, source: Source) => (source === Source.SOUNDCLOUD ? searchSoundcloud(query) : searchYoutube(query));

// null means the link isn't from a platform we know, which the caller reports differently from a failed lookup
export const importLink = (url: URL): Promise<Track[]> | null => {
    if (isYoutubeLink(url)) return importYoutube(url);
    if (isSoundcloudLink(url)) return importSoundcloud(url);
    if (isSpotifyLink(url)) return importSpotify(url);
    return null;
};

export const downloadAudio = (track: Track): Promise<Audio> => {
    if (track.source === Source.YOUTUBE) return downloadYoutube(track);
    if (track.source === Source.SOUNDCLOUD) return downloadSoundcloud(track.sourceId);
    if (track.source === Source.SPOTIFY) return downloadSpotify(track);
    return Promise.reject(new Error("Track has no source"));
};
