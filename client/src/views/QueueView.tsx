import { DragEvent, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Plus, Shuffle, Trash2 } from "lucide-react";
import { TrackRow } from "../components/TrackRow";
import { Player } from "../hooks/usePlayer";
import { plural } from "../utils/format";

type Props = {
    player: Player;
    nameOf: (userId: string) => string;
    confirmRemove: boolean;
    onAdd: () => void;
};

// Dragging is a shortcut; the up/down buttons do the same, so reordering also works by keyboard and on touch
export const QueueView = ({ player, nameOf, confirmRemove, onAdd }: Props) => {
    const [dragged, setDragged] = useState<string | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);
    const queue = player.state?.queue ?? [];
    const current = player.state?.current ?? -1;

    const remove = (trackId: string, title: string) => {
        if (confirmRemove && !confirm(`Remove "${title}" from the queue?`)) return;
        player.remove(trackId);
    };

    const drop = (event: DragEvent, index: number) => {
        event.preventDefault();
        if (dragged) player.move(dragged, index);
        setDragged(null);
        setDropIndex(null);
    };

    return (
        <div className="view queue-view">
            <div className="view-head">
                <div>
                    <h1>Queue</h1>
                    <p className="muted">{plural(queue.length, "track", "tracks")} · drag or use the arrows to reorder</p>
                </div>
                <div className="view-actions">
                    <button className="button ghost" onClick={player.shuffle} disabled={queue.length - current < 3}>
                        <Shuffle aria-hidden="true" /> Shuffle upcoming
                    </button>
                    <button className="button primary" onClick={onAdd}>
                        <Plus aria-hidden="true" /> Add
                    </button>
                </div>
            </div>

            <section className="card">
                {!queue.length && <p className="empty">The queue is empty. Add a track and it starts playing right away.</p>}
                <ol className="track-list sortable">
                    {queue.map((track, index) => (
                        <li
                            key={track.id}
                            className={`${dragged === track.id ? "dragging" : ""}${dropIndex === index && dragged !== track.id ? " drop-target" : ""}`}
                            onDragOver={(event) => {
                                event.preventDefault();
                                setDropIndex(index);
                            }}
                            onDrop={(event) => drop(event, index)}
                        >
                            <TrackRow
                                track={track}
                                subtitle={track.artist || `Added by ${nameOf(track.addedBy)}`}
                                status={index === current ? "current" : index < current ? "played" : "upcoming"}
                                playing={!!player.state?.playing}
                                duration={index === current ? player.duration : undefined}
                                onPlay={() => player.play(track.id)}
                                leading={
                                    <span
                                        className="drag-handle"
                                        draggable
                                        onDragStart={(event) => {
                                            event.dataTransfer.effectAllowed = "move";
                                            setDragged(track.id);
                                        }}
                                        onDragEnd={() => {
                                            setDragged(null);
                                            setDropIndex(null);
                                        }}
                                        aria-hidden="true"
                                    >
                                        <GripVertical />
                                    </span>
                                }
                                actions={
                                    <>
                                        <button className="icon-button small" onClick={() => player.move(track.id, index - 1)} disabled={index === 0} aria-label={`Move up: ${track.title}`}>
                                            <ChevronUp />
                                        </button>
                                        <button
                                            className="icon-button small"
                                            onClick={() => player.move(track.id, index + 1)}
                                            disabled={index === queue.length - 1}
                                            aria-label={`Move down: ${track.title}`}
                                        >
                                            <ChevronDown />
                                        </button>
                                        <button className="icon-button small danger" onClick={() => remove(track.id, track.title)} aria-label={`Remove from queue: ${track.title}`}>
                                            <Trash2 />
                                        </button>
                                    </>
                                }
                            />
                        </li>
                    ))}
                </ol>
            </section>
        </div>
    );
};
