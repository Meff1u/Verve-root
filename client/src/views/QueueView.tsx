import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { ChevronDown, ChevronUp, GripVertical, Link2, Shuffle, Trash2 } from "lucide-react";
import { Track } from "@verve/gen-shared";
import { TrackRow } from "../components/TrackRow";
import { Player } from "../hooks/usePlayer";
import { plural } from "../utils/format";
import { spring, viewVariants } from "../utils/motion";

type Props = {
    player: Player;
    nameOf: (userId: string) => string;
    confirmRemove: boolean;
    onImport: () => void;
};

type ItemProps = {
    track: Track;
    index: number;
    count: number;
    current: number;
    player: Player;
    nameOf: (userId: string) => string;
    onRemove: (track: Track) => void;
    onDrop: () => void;
};

// Only the grip starts a drag, so scrolling the list on a phone never moves tracks by accident
const QueueItem = ({ track, index, count, current, player, nameOf, onRemove, onDrop }: ItemProps) => {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={track.id}
            dragListener={false}
            dragControls={controls}
            onDragEnd={onDrop}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
            whileDrag={{ scale: 1.02, boxShadow: "0 16px 40px rgba(139, 92, 246, 0.35)", zIndex: 2 }}
            transition={spring}
            className="queue-item"
        >
            <TrackRow
                track={track}
                subtitle={track.artist || `Added by ${nameOf(track.addedBy)}`}
                status={index === current ? "current" : index < current ? "played" : "upcoming"}
                playing={!!player.state?.playing}
                duration={index === current ? player.duration : undefined}
                onPlay={() => player.play(track.id)}
                leading={
                    <span className="drag-handle" onPointerDown={(event) => controls.start(event)} aria-hidden="true">
                        <GripVertical />
                    </span>
                }
                actions={
                    <>
                        <button className="icon-button small" onClick={() => player.move(track.id, index - 1)} disabled={index === 0} aria-label={`Move up: ${track.title}`}>
                            <ChevronUp />
                        </button>
                        <button className="icon-button small" onClick={() => player.move(track.id, index + 1)} disabled={index === count - 1} aria-label={`Move down: ${track.title}`}>
                            <ChevronDown />
                        </button>
                        <button className="icon-button small danger" onClick={() => onRemove(track)} aria-label={`Remove from queue: ${track.title}`}>
                            <Trash2 />
                        </button>
                    </>
                }
            />
        </Reorder.Item>
    );
};

// Dragging reorders the list locally for instant feedback and sends one move on release; the up/down buttons do the
// same job, so reordering also works by keyboard
export const QueueView = ({ player, nameOf, confirmRemove, onImport }: Props) => {
    const queue = player.state?.queue ?? [];
    const current = player.state?.current ?? -1;
    const [order, setOrder] = useState(() => queue.map((track) => track.id));
    const orderRef = useRef(order);
    const dragging = useRef(false);

    // The server's order wins whenever nothing is being dragged
    useEffect(() => {
        if (dragging.current) return;
        const ids = queue.map((track) => track.id);
        orderRef.current = ids;
        setOrder(ids);
    }, [player.state]);

    const reorder = (ids: string[]) => {
        dragging.current = true;
        orderRef.current = ids;
        setOrder(ids);
    };

    const drop = (trackId: string) => {
        dragging.current = false;
        const from = queue.findIndex((track) => track.id === trackId);
        const to = orderRef.current.indexOf(trackId);
        if (from !== to && to !== -1) player.move(trackId, to);
    };

    const remove = (track: Track) => {
        if (confirmRemove && !confirm(`Remove "${track.title}" from the queue?`)) return;
        player.remove(track.id);
    };

    const tracks = new Map(queue.map((track) => [track.id, track]));

    return (
        <motion.div className="view queue-view" variants={viewVariants} initial="hidden" animate="visible" exit="exit">
            <div className="view-head">
                <div>
                    <h1>Queue</h1>
                    <p className="muted">{plural(queue.length, "track", "tracks")} · drag the grip or use the arrows to reorder</p>
                </div>
                <div className="view-actions">
                    <button className="button ghost" onClick={player.shuffle} disabled={queue.length - current < 3}>
                        <Shuffle aria-hidden="true" /> Shuffle upcoming
                    </button>
                    <button className="button primary" onClick={onImport}>
                        <Link2 aria-hidden="true" /> Import link
                    </button>
                </div>
            </div>

            <section className="card">
                {!queue.length && <p className="empty">The queue is empty. Search on the Player tab or import a playlist.</p>}
                <Reorder.Group axis="y" values={order} onReorder={reorder} as="ol" className="track-list sortable">
                    <AnimatePresence initial={false}>
                        {order.map((id, index) => {
                            const track = tracks.get(id);
                            return track ? (
                                <QueueItem
                                    key={id}
                                    track={track}
                                    index={index}
                                    count={order.length}
                                    current={current}
                                    player={player}
                                    nameOf={nameOf}
                                    onRemove={remove}
                                    onDrop={() => drop(id)}
                                />
                            ) : null;
                        })}
                    </AnimatePresence>
                </Reorder.Group>
            </section>
        </motion.div>
    );
};
