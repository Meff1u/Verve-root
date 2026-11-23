import { useEffect, useRef, useState } from "react";
import { Music } from "lucide-react";
import { Track } from "@verve/gen-shared";
import { cachedCover, loadCover } from "../utils/coverLoader";
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

// Each cover is a request to our server, so it's only asked for once its tile is about to scroll into view; until it
// arrives (or if it fails) the tile shows a gradient picked from the title, and the cover fades in over it
export const TrackCover = ({ track, size }: Props) => {
    const url = track?.coverUrl ?? "";
    const tile = useRef<HTMLDivElement>(null);
    const [fetched, setFetched] = useState({ url: "", src: "" });
    const [loaded, setLoaded] = useState(false);
    const src = fetched.url === url ? fetched.src : cachedCover(url);

    useEffect(() => {
        if (!url || src || !tile.current) return;
        let cancelled = false;
        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                observer.disconnect();
                loadCover(url).then((objectUrl) => !cancelled && setFetched({ url, src: objectUrl }), () => {});
            },
            { rootMargin: "200px" },
        );
        observer.observe(tile.current);
        return () => {
            cancelled = true;
            observer.disconnect();
        };
    }, [url, src]);

    if (src) {
        return <img className={`cover ${size}${loaded ? " loaded" : ""}`} src={src} alt="" onLoad={() => setLoaded(true)} />;
    }

    const [from, to] = pickGradient(track?.title ?? "", gradients);
    return (
        <div ref={tile} className={`cover ${size} placeholder`} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} aria-hidden="true">
            <Music />
        </div>
    );
};
