import { useState } from "react";
import { Player } from "../hooks/usePlayer";

const formatTime = (seconds: number) => {
    const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

type Props = {
    player: Player;
    nameOf: (userId: string) => string;
};

export const NowPlaying = ({ player, nameOf }: Props) => {
    // While the slider is held it shows the dragged spot; the seek is sent once, on release
    const [dragging, setDragging] = useState<number | null>(null);
    const { state, currentTrack, position, duration } = player;

    const commitSeek = () => {
        if (dragging === null) return;
        player.seek(dragging);
        setDragging(null);
    };

    return (
        <section className="now-playing">
            <div className="track-info">
                <span className="label">{currentTrack ? (state?.playing ? "Now playing" : "Paused") : "Nothing playing"}</span>
                <h1 className="title">{currentTrack?.title ?? "Add a track to start"}</h1>
                {currentTrack && <span className="added-by">Added by {nameOf(currentTrack.addedBy)}</span>}
            </div>

            <div className="seek">
                <span className="time">{formatTime(dragging ?? position)}</span>
                <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={dragging ?? Math.min(position, duration || 0)}
                    disabled={!currentTrack || !duration}
                    onChange={(event) => setDragging(Number(event.target.value))}
                    onPointerUp={commitSeek}
                    onKeyUp={commitSeek}
                    aria-label="Seek"
                />
                <span className="time">{formatTime(duration)}</span>
            </div>

            <div className="controls">
                <button onClick={player.shuffle} disabled={!state?.queue.length} title="Shuffle upcoming tracks">
                    Shuffle
                </button>
                <button onClick={player.previous} disabled={!state?.queue.length} title="Previous">
                    ⏮
                </button>
                <button className="primary" onClick={() => (state?.playing ? player.pause() : player.play())} disabled={!state?.queue.length}>
                    {state?.playing ? "⏸" : "▶"}
                </button>
                <button onClick={player.next} disabled={!currentTrack} title="Next">
                    ⏭
                </button>
                <label className="volume">
                    Volume
                    <input type="range" min={0} max={1} step={0.01} value={player.volume} onChange={(event) => player.setVolume(Number(event.target.value))} />
                </label>
            </div>
        </section>
    );
};
