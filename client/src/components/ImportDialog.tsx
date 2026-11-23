import { FormEvent, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { siSoundcloud, siSpotify, siYoutube } from "simple-icons";
import { Player } from "../hooks/usePlayer";
import { BrandIcon } from "./BrandIcon";

const examples = [
    { icon: siYoutube, text: "youtube.com/watch?v=… or a playlist" },
    { icon: siSoundcloud, text: "soundcloud.com/artist/track or /sets/…" },
    { icon: siSpotify, text: "open.spotify.com/track, /album or /playlist" },
];

type Props = {
    open: boolean;
    player: Player;
    onClose: () => void;
};

export const ImportDialog = ({ open, player, onClose }: Props) => {
    const dialog = useRef<HTMLDialogElement>(null);
    const [url, setUrl] = useState("");
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        if (!dialog.current) return;
        if (open && !dialog.current.open) {
            setUrl("");
            dialog.current.showModal();
        }
        if (!open && dialog.current.open) dialog.current.close();
    }, [open]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (importing) return;

        setImporting(true);
        const imported = await player.importLink(url);
        setImporting(false);

        // A failed import keeps the dialog and the link, so it can be fixed instead of pasted again
        if (imported) onClose();
    };

    return (
        <dialog ref={dialog} className="dialog" onClose={onClose} aria-labelledby="import-title">
            <form onSubmit={submit}>
                <div className="dialog-head">
                    <h2 id="import-title">Import from a link</h2>
                    <button type="button" className="icon-button small" onClick={onClose} aria-label="Close">
                        <X />
                    </button>
                </div>

                <label className="field">
                    <span>Track, album or playlist link</span>
                    <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Paste a link…" required autoFocus />
                </label>

                <ul className="import-examples">
                    {examples.map(({ icon, text }) => (
                        <li key={icon.slug}>
                            <BrandIcon icon={icon} />
                            {text}
                        </li>
                    ))}
                </ul>

                {player.error && (
                    <p className="field-error" role="alert">
                        {player.error}
                    </p>
                )}

                <div className="dialog-actions">
                    <button type="button" className="button ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="button primary" disabled={importing}>
                        {importing ? <span className="spinner" aria-hidden="true" /> : null}
                        {importing ? "Importing…" : "Add to queue"}
                    </button>
                </div>
            </form>
        </dialog>
    );
};
