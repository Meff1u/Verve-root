import { useState } from "react";
import { Music } from "lucide-react";
import { Track } from "@verve/gen-shared";
import { pickGradient } from "../utils/format";

const gradients = [
    ["#8B5CF6", "#EC4899"],
    ["#22D3EE", "#8B5CF6"],
    ["#F472B6", "#FB923C"],
    ["#6366F1", "#22D3EE"],
    ["#A855F7", "#F43F5E"],
];

type Props = {
    track: Track | null;
    size: "small" | "medium" | "large";
};

// Covers fade in once loaded; tracks without one (or whose image fails) get a gradient tile picked from the title
export const TrackCover = ({ track, size }: Props) => {
    const [failed, setFailed] = useState(false);
    const [loaded, setLoaded] = useState(false);

    if (track?.coverUrl && !failed) {
        return (
            <img
                className={`cover ${size}${loaded ? " loaded" : ""}`}
                src={track.coverUrl}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
            />
        );
    }

    const [from, to] = pickGradient(track?.title ?? "", gradients);
    return (
        <div className={`cover ${size} placeholder`} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} aria-hidden="true">
            <Music />
        </div>
    );
};
