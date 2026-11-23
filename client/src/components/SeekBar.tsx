import { CSSProperties, useState } from "react";
import { formatTime } from "../utils/format";

type Props = {
    position: number;
    duration: number;
    disabled: boolean;
    onSeek: (seconds: number) => void;
};

export const SeekBar = ({ position, duration, disabled, onSeek }: Props) => {
    // While the thumb is held it shows the dragged spot; the seek is sent once, on release
    const [dragging, setDragging] = useState<number | null>(null);
    const shown = dragging ?? Math.min(position, duration || 0);
    const progress = duration ? (shown / duration) * 100 : 0;

    const commit = () => {
        if (dragging === null) return;
        onSeek(dragging);
        setDragging(null);
    };

    return (
        <div className="seek-bar">
            <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={shown}
                disabled={disabled || !duration}
                onChange={(event) => setDragging(Number(event.target.value))}
                onPointerUp={commit}
                onKeyUp={commit}
                aria-label="Track position"
                aria-valuetext={`${formatTime(shown)} of ${formatTime(duration)}`}
                style={{ "--progress": `${progress}%` } as CSSProperties}
            />
            <div className="seek-times">
                <span>{formatTime(shown)}</span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>
    );
};
