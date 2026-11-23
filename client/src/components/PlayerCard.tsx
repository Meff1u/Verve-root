import { CSSProperties, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Disc3, Heart, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { RepeatMode } from "@verve/gen-shared";
import { Library } from "../hooks/useLibrary";
import { Player } from "../hooks/usePlayer";
import { spring, tap } from "../utils/motion";
import { SeekBar } from "./SeekBar";
import { SourceBadge } from "./SourceBadge";
import { TrackCover } from "./TrackCover";
import { Visualizer } from "./Visualizer";

const repeatLabels: Record<RepeatMode, string> = {
    [RepeatMode.OFF]: "Repeat off",
    [RepeatMode.ALL]: "Repeat queue",
    [RepeatMode.ONE]: "Repeat track",
};

type Props = {
    player: Player;
    library: Library;
    nameOf: (userId: string) => string;
    visualizer: boolean;
};

export const PlayerCard = ({ player, library, nameOf, visualizer }: Props) => {
    const track = player.currentTrack;
    const playing = !!player.state?.playing;
    const hasQueue = !!player.state?.queue.length;
    const repeat = player.state?.repeat ?? RepeatMode.OFF;
    const favorite = library.isFavorite(track);
    const loading = player.loading;

    // Unmuting brings back the level from before muting rather than jumping to full volume
    const lastVolume = useRef(player.volume || 0.5);
    const toggleMute = () => {
        if (player.volume) lastVolume.current = player.volume;
        player.setVolume(player.volume ? 0 : lastVolume.current);
    };

    return (
        <section className="card player-card" aria-label="Player">
            <div className="cover-stage">
                {/* The old cover fades out as the new one scales in, so a track change feels like a turn, not a cut */}
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={track?.id ?? "empty"}
                        className={`cover-frame${playing && loading === null ? " playing" : ""}`}
                        initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 1.08 }}
                        transition={spring}
                    >
                        <TrackCover track={track} size="large" />
                    </motion.div>
                </AnimatePresence>

                <AnimatePresence>
                    {loading !== null && (
                        <motion.div className="cover-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status">
                            <svg viewBox="0 0 48 48" aria-hidden="true">
                                <circle cx="24" cy="24" r="20" className="ring-track" />
                                <motion.circle cx="24" cy="24" r="20" className="ring-fill" animate={{ pathLength: Math.max(loading, 0.04) }} transition={{ duration: 0.3 }} />
                            </svg>
                            <span>Loading {Math.round(loading * 100)}%</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="player-main">
                <div className="player-head">
                    {/* popLayout shows the new title at once; "wait" would hold it back until the old one finished leaving,
                        which never happens while the tab is in the background and animation frames are paused */}
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                            key={track?.id ?? "empty"}
                            className="player-titles"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                        >
                            <h1>{track?.title ?? "Nothing playing"}</h1>
                            <p className="player-artist">{track ? track.artist || "Unknown artist" : "Search for a song above to start listening together"}</p>
                            {track && (
                                <p className="player-meta">
                                    <SourceBadge source={track.source} />
                                    {track.album && (
                                        <>
                                            <Disc3 aria-hidden="true" />
                                            <span className="accent">{track.album}</span>
                                            <span className="dot">•</span>
                                        </>
                                    )}
                                    {track.year > 0 && (
                                        <>
                                            {track.year}
                                            <span className="dot">•</span>
                                        </>
                                    )}
                                    Added by {nameOf(track.addedBy)}
                                </p>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    <motion.button
                        className={`icon-button outlined${favorite ? " active" : ""}`}
                        onClick={() => track && library.toggleFavorite(track)}
                        disabled={!track}
                        aria-pressed={favorite}
                        aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
                        whileTap={tap}
                    >
                        <motion.span key={String(favorite)} className="icon-pop" initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={spring}>
                            <Heart fill={favorite ? "currentColor" : "none"} />
                        </motion.span>
                    </motion.button>
                </div>

                <SeekBar getPosition={player.getPosition} duration={player.duration} playing={playing && loading === null} disabled={!track || loading !== null} onSeek={player.seek} />

                <div className="player-controls">
                    <div className="transport">
                        <motion.button className="icon-button" onClick={player.shuffle} disabled={!hasQueue} aria-label="Shuffle upcoming tracks" title="Shuffle upcoming tracks" whileTap={tap}>
                            <Shuffle />
                        </motion.button>
                        <motion.button className="icon-button" onClick={player.previous} disabled={!hasQueue} aria-label="Previous track" whileTap={tap}>
                            <SkipBack fill="currentColor" />
                        </motion.button>
                        <motion.button
                            className="play-button"
                            onClick={() => (playing ? player.pause() : player.play())}
                            disabled={!hasQueue}
                            aria-label={playing ? "Pause" : "Play"}
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.06 }}
                        >
                            <AnimatePresence mode="popLayout" initial={false}>
                                <motion.span
                                    key={playing ? "pause" : "play"}
                                    className="icon-pop"
                                    initial={{ scale: 0, rotate: -90, opacity: 0 }}
                                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                    exit={{ scale: 0, rotate: 90, opacity: 0 }}
                                    transition={spring}
                                >
                                    {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
                                </motion.span>
                            </AnimatePresence>
                        </motion.button>
                        <motion.button className="icon-button" onClick={player.next} disabled={!track} aria-label="Next track" whileTap={tap}>
                            <SkipForward fill="currentColor" />
                        </motion.button>
                        <motion.button
                            className={`icon-button${repeat !== RepeatMode.OFF ? " active" : ""}`}
                            onClick={player.cycleRepeat}
                            aria-label={repeatLabels[repeat]}
                            title={repeatLabels[repeat]}
                            whileTap={tap}
                        >
                            {repeat === RepeatMode.ONE ? <Repeat1 /> : <Repeat />}
                        </motion.button>
                    </div>

                    <div className="volume">
                        <button className="icon-button small" onClick={toggleMute} aria-label={player.volume ? "Mute" : "Unmute"}>
                            {player.volume ? <Volume2 /> : <VolumeX />}
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={player.volume}
                            onChange={(event) => player.setVolume(Number(event.target.value))}
                            aria-label="Volume"
                            style={{ "--progress": `${player.volume * 100}%` } as CSSProperties}
                        />
                    </div>
                </div>
            </div>

            {visualizer && <Visualizer active={playing && loading === null} />}
        </section>
    );
};
