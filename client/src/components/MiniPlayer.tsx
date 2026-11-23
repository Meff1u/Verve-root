import { CSSProperties, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Pause, Play, SkipForward } from "lucide-react";
import { Player } from "../hooks/usePlayer";
import { tap } from "../utils/motion";
import { TrackCover } from "./TrackCover";

type Props = {
    player: Player;
    onOpen: () => void;
};

// On phones the full player only lives on its own tab, so the other tabs get a slim bar above the navigation:
// what's playing, a progress line, play/pause and next; tapping the bar opens the player
export const MiniPlayer = ({ player, onOpen }: Props) => {
    const track = player.currentTrack;
    const playing = !!player.state?.playing;
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const update = () => setProgress(player.duration ? Math.min(1, player.getPosition() / player.duration) : 0);
        update();
        const timer = setInterval(update, 500);
        return () => clearInterval(timer);
    }, [player.duration, player.getPosition]);

    if (!track) return null;

    return (
        <motion.div
            className="mini-player"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            style={{ "--progress": `${progress * 100}%` } as CSSProperties}
        >
            <button className="mini-main" onClick={onOpen} aria-label={`Open player: ${track.title}`}>
                <TrackCover track={track} size="small" />
                <span className="track-text">
                    <span className="track-title">{track.title}</span>
                    <span className="track-subtitle">{player.loading !== null ? "Loading…" : player.waiting ? "Starting…" : track.artist || "Unknown artist"}</span>
                </span>
            </button>
            <motion.button className="icon-button" onClick={() => (playing ? player.pause() : player.play())} aria-label={playing ? "Pause" : "Play"} whileTap={tap}>
                {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
            </motion.button>
            <motion.button className="icon-button" onClick={player.next} aria-label="Next track" whileTap={tap}>
                <SkipForward fill="currentColor" />
            </motion.button>
        </motion.div>
    );
};
