import { Source, Track } from "@verve/gen-shared";
import { downloadSoundcloud, downloadSoundcloudMatch, importSoundcloud, isSoundcloudLink, searchSoundcloud } from "./soundcloud";
import { importSpotify, isSpotifyLink } from "./spotify";
import { Audio, LinkContents } from "./track";
import { importYoutube, isYoutubeLink, searchYoutube } from "./youtube";

export const search = (query: string, source: Source) => (source === Source.SOUNDCLOUD ? searchSoundcloud(query) : searchYoutube(query));

// null means the link isn't from a platform we know, which the caller reports differently from a failed lookup
export const importLink = (url: URL): Promise<LinkContents> | null => {
    if (isYoutubeLink(url)) return importYoutube(url);
    if (isSoundcloudLink(url)) return importSoundcloud(url);
    if (isSpotifyLink(url)) return importSpotify(url);
    return null;
};

// YouTube cuts downloads off after the first megabyte and Spotify has no audio at all, so tracks from both play the same
// song found on SoundCloud
export const downloadAudio = (track: Track): Promise<Audio> => {
    if (track.source === Source.SOUNDCLOUD) return downloadSoundcloud(track.sourceId);
    if (track.source === Source.YOUTUBE || track.source === Source.SPOTIFY) return downloadSoundcloudMatch(track);
    return Promise.reject(new Error("Track has no source"));
};
