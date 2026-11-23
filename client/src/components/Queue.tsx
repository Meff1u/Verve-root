import { FormEvent, useState } from "react";
import { Player } from "../hooks/usePlayer";

type Props = {
    player: Player;
    nameOf: (userId: string) => string;
};

export const Queue = ({ player, nameOf }: Props) => {
    const [url, setUrl] = useState("");
    const [title, setTitle] = useState("");
    const [adding, setAdding] = useState(false);
    const queue = player.state?.queue ?? [];

    const add = async (event: FormEvent) => {
        event.preventDefault();
        if (!url.trim() || adding) return;

        setAdding(true);
        const added = await player.add(url, title);
        setAdding(false);

        // The form keeps what was typed when adding fails, so a typo can be fixed instead of retyped
        if (!added) return;
        setUrl("");
        setTitle("");
    };

    return (
        <section className="queue">
            <form className="add-track" onSubmit={add}>
                <input type="url" placeholder="Link to an audio file (mp3, ogg…)" value={url} onChange={(event) => setUrl(event.target.value)} required />
                <input type="text" placeholder="Title (optional)" value={title} onChange={(event) => setTitle(event.target.value)} />
                <button type="submit" disabled={adding}>
                    Add
                </button>
            </form>

            <h2>Queue · {queue.length}</h2>
            {!queue.length && <p className="empty">The queue is empty.</p>}

            <ol>
                {queue.map((track, index) => (
                    <li key={track.id} className={index === player.state?.current ? "current" : index < (player.state?.current ?? -1) ? "played" : ""}>
                        <button className="track" onClick={() => player.play(track.id)} title="Play this track">
                            <span className="track-title">{track.title}</span>
                            <span className="track-meta">{nameOf(track.addedBy)}</span>
                        </button>
                        <button className="remove" onClick={() => player.remove(track.id)} title="Remove from queue" aria-label={`Remove ${track.title}`}>
                            ✕
                        </button>
                    </li>
                ))}
            </ol>
        </section>
    );
};
