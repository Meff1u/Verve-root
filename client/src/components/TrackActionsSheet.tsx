import { ArrowDown, ArrowUp, ListStart, Play, Trash2 } from "lucide-react";
import { Track } from "@verve/gen-shared";
import { Player } from "../hooks/usePlayer";
import { Modal } from "./Modal";
import { TrackCover } from "./TrackCover";

type Props = {
    track: Track | null;
    open: boolean;
    index: number;
    count: number;
    current: number;
    player: Player;
    onRemove: (track: Track) => void;
    onClose: () => void;
};

// On phones a queue row has room for the title or for five buttons, not both, so the actions move into a sheet
// opened from one "more" button; it also gives touch users the single-tap alternative to dragging
export const TrackActionsSheet = ({ track, open, index, count, current, player, onRemove, onClose }: Props) => {
    const act = (action: () => void) => () => {
        action();
        onClose();
    };

    const actions = track
        ? [
              { label: "Play now", icon: Play, run: () => player.play(track.id), hidden: index === current },
              { label: "Play next", icon: ListStart, run: () => player.move(track.id, current < index ? current + 1 : current), hidden: current === -1 || index === current || index === current + 1 },
              { label: "Move up", icon: ArrowUp, run: () => player.move(track.id, index - 1), hidden: index === 0 },
              { label: "Move down", icon: ArrowDown, run: () => player.move(track.id, index + 1), hidden: index === count - 1 },
              { label: "Remove from queue", icon: Trash2, run: () => onRemove(track), danger: true },
          ].filter((action) => !action.hidden)
        : [];

    return (
        <Modal open={open} onClose={onClose} labelledBy="track-actions-title">
            {track && (
                <div className="dialog-body">
                    <div className="sheet-track">
                        <TrackCover track={track} size="small" />
                        <span className="track-text">
                            <span className="track-title" id="track-actions-title">
                                {track.title}
                            </span>
                            <span className="track-subtitle">{track.artist || "Unknown artist"}</span>
                        </span>
                    </div>
                    <div className="sheet-actions">
                        {actions.map(({ label, icon: Icon, run, danger }) => (
                            <button key={label} className={`sheet-action${danger ? " danger" : ""}`} onClick={act(run)}>
                                <Icon aria-hidden="true" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </Modal>
    );
};
