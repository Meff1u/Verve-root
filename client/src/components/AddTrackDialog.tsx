import { FormEvent, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Player } from "../hooks/usePlayer";

type Props = {
    open: boolean;
    initialUrl: string;
    player: Player;
    onClose: () => void;
};

export const AddTrackDialog = ({ open, initialUrl, player, onClose }: Props) => {
    const dialog = useRef<HTMLDialogElement>(null);
    const [url, setUrl] = useState("");
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (!dialog.current) return;
        if (open && !dialog.current.open) {
            setUrl(initialUrl);
            setTitle("");
            setArtist("");
            dialog.current.showModal();
        }
        if (!open && dialog.current.open) dialog.current.close();
    }, [open]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (adding) return;

        setAdding(true);
        const added = await player.add(url, title, artist);
        setAdding(false);

        // A failed add keeps the dialog and what was typed, so a typo can be fixed instead of retyped
        if (added) onClose();
    };

    return (
        <dialog ref={dialog} className="dialog" onClose={onClose} aria-labelledby="add-track-title">
            <form onSubmit={submit}>
                <div className="dialog-head">
                    <h2 id="add-track-title">Add from link</h2>
                    <button type="button" className="icon-button small" onClick={onClose} aria-label="Close">
                        <X />
                    </button>
                </div>

                <label className="field">
                    <span>Audio file link</span>
                    <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…/track.mp3" required autoFocus />
                    <small>Direct links only for now (mp3, ogg, wav). YouTube and Spotify are coming next.</small>
                </label>
                <label className="field">
                    <span>Title (optional)</span>
                    <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Taken from the file name if empty" />
                </label>
                <label className="field">
                    <span>Artist (optional)</span>
                    <input type="text" value={artist} onChange={(event) => setArtist(event.target.value)} />
                </label>

                {player.error && (
                    <p className="field-error" role="alert">
                        {player.error}
                    </p>
                )}

                <div className="dialog-actions">
                    <button type="button" className="button ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="button primary" disabled={adding}>
                        {adding ? "Adding…" : "Add to queue"}
                    </button>
                </div>
            </form>
        </dialog>
    );
};
