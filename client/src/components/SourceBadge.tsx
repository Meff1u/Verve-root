import { SimpleIcon, siSoundcloud, siSpotify, siYoutubemusic } from "simple-icons";
import { Source } from "@verve/gen-shared";

export const sourceIcons: Partial<Record<Source, { name: string; icon: SimpleIcon }>> = {
    [Source.YOUTUBE]: { name: "YouTube Music", icon: siYoutubemusic },
    [Source.SOUNDCLOUD]: { name: "SoundCloud", icon: siSoundcloud },
    [Source.SPOTIFY]: { name: "Spotify", icon: siSpotify },
};

// A small platform logo next to a track, so it's clear where it came from
export const SourceBadge = ({ source }: { source: Source }) => {
    const entry = sourceIcons[source];
    if (!entry) return null;

    return (
        <svg className="source-badge" viewBox="0 0 24 24" role="img" aria-label={entry.name}>
            <title>{entry.name}</title>
            <path d={entry.icon.path} fill={`#${entry.icon.hex}`} />
        </svg>
    );
};
