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

// Direct links have no artwork yet, so they get a gradient tile picked from the title instead of an empty box
export const TrackCover = ({ track, size }: Props) => {
    if (track?.coverUrl) return <img className={`cover ${size}`} src={track.coverUrl} alt="" loading="lazy" />;

    const [from, to] = pickGradient(track?.title ?? "", gradients);
    return (
        <div className={`cover ${size} placeholder`} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} aria-hidden="true">
            <Music />
        </div>
    );
};
