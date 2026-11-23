import { ReactNode } from "react";
import { AudioLines, Play } from "lucide-react";
import { Track } from "@verve/gen-shared";
import { formatTime } from "../utils/format";
import { TrackCover } from "./TrackCover";

type Props = {
    track: Track;
    subtitle: string;
    status: "current" | "played" | "upcoming";
    playing: boolean;
    duration?: number;
    onPlay: () => void;
    leading?: ReactNode;
    actions?: ReactNode;
};

export const TrackRow = ({ track, subtitle, status, playing, duration, onPlay, leading, actions }: Props) => {
    const length = duration || track.duration;

    return (
        <div className={`track-row ${status}`}>
            {leading}
            <span className="track-state" aria-hidden="true">
                {status === "current" ? playing ? <AudioLines /> : <Play /> : null}
            </span>
            <button className="track-main" onClick={onPlay} aria-label={`Play ${track.title}`} aria-current={status === "current" ? "true" : undefined}>
                <TrackCover track={track} size="small" />
                <span className="track-text">
                    <span className="track-title">{track.title}</span>
                    <span className="track-subtitle">{subtitle}</span>
                </span>
            </button>
            <span className="track-duration">{length ? formatTime(length) : ""}</span>
            {actions && <div className="track-actions">{actions}</div>}
        </div>
    );
};
