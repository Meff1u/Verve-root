import { CSSProperties, useRef } from "react";
import { Disc3, Heart, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { RepeatMode } from "@verve/gen-shared";
import { Library } from "../hooks/useLibrary";
import { Player } from "../hooks/usePlayer";
import { SeekBar } from "./SeekBar";
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

    // Unmuting brings back the level from before muting rather than jumping to full volume
    const lastVolume = useRef(player.volume || 0.5);
    const toggleMute = () => {
        if (player.volume) lastVolume.current = player.volume;
        player.setVolume(player.volume ? 0 : lastVolume.current);
    };

    return (
        <section className="card player-card" aria-label="Player">
            <TrackCover track={track} size="large" />

            <div className="player-main">
                <div className="player-head">
                    <div className="player-titles">
                        <h1>{track?.title ?? "Nothing playing"}</h1>
                        <p className="player-artist">{track ? track.artist || "Unknown artist" : "Add a track from a link to start listening together"}</p>
                        {track && (
                            <p className="player-meta">
                                <Disc3 aria-hidden="true" />
                                {track.album && (
                                    <>
                                        Album: <span className="accent">{track.album}</span>
                                        <span className="dot">•</span>
                                    </>
                                )}
                                {track.year > 0 && (
                                    <>
                                        Year: {track.year}
                                        <span className="dot">•</span>
                                    </>
                                )}
                                Added by {nameOf(track.addedBy)}
                            </p>
                        )}
                    </div>
                    <button
                        className={`icon-button outlined${favorite ? " active" : ""}`}
                        onClick={() => track && library.toggleFavorite(track)}
                        disabled={!track}
                        aria-pressed={favorite}
                        aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
                    >
                        <Heart fill={favorite ? "currentColor" : "none"} />
                    </button>
                </div>

                <SeekBar position={player.position} duration={player.duration} disabled={!track} onSeek={player.seek} />

                <div className="player-controls">
                    <div className="transport">
                        <button className="icon-button" onClick={player.shuffle} disabled={!hasQueue} aria-label="Shuffle upcoming tracks" title="Shuffle upcoming tracks">
                            <Shuffle />
                        </button>
                        <button className="icon-button" onClick={player.previous} disabled={!hasQueue} aria-label="Previous track">
                            <SkipBack fill="currentColor" />
                        </button>
                        <button className="play-button" onClick={() => (playing ? player.pause() : player.play())} disabled={!hasQueue} aria-label={playing ? "Pause" : "Play"}>
                            {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
                        </button>
                        <button className="icon-button" onClick={player.next} disabled={!track} aria-label="Next track">
                            <SkipForward fill="currentColor" />
                        </button>
                        <button
                            className={`icon-button${repeat !== RepeatMode.OFF ? " active" : ""}`}
                            onClick={player.cycleRepeat}
                            aria-label={repeatLabels[repeat]}
                            title={repeatLabels[repeat]}
                        >
                            {repeat === RepeatMode.ONE ? <Repeat1 /> : <Repeat />}
                        </button>
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

            {visualizer && <Visualizer active={playing} />}
        </section>
    );
};
