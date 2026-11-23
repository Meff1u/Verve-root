import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, ListMusic, X } from "lucide-react";
import { SimpleIcon, siSoundcloud, siSpotify, siYoutube } from "simple-icons";
import { playerServiceClient } from "@verve/gen-client";
import { Track } from "@verve/gen-shared";
import constants from "../constants";
import { describeError, Player } from "../hooks/usePlayer";
import { formatTime, plural } from "../utils/format";
import { spring } from "../utils/motion";
import { BrandIcon } from "./BrandIcon";
import { Modal } from "./Modal";
import { TrackCover } from "./TrackCover";

type Platform = { id: string; name: string; icon: SimpleIcon; matches: (url: URL) => boolean };

const platforms: Platform[] = [
    { id: "youtube", name: "YouTube", icon: siYoutube, matches: (url) => /(^|\.)youtube\.com$|^youtu\.be$/.test(url.hostname) },
    { id: "soundcloud", name: "SoundCloud", icon: siSoundcloud, matches: (url) => /(^|\.)soundcloud\.com$/.test(url.hostname) },
    { id: "spotify", name: "Spotify", icon: siSpotify, matches: (url) => url.hostname === "open.spotify.com" },
];

type Status = { kind: "idle" } | { kind: "unsupported" } | { kind: "fetching" } | { kind: "ready"; title: string; tracks: Track[] } | { kind: "error"; message: string };

const parseLink = (text: string) => {
    try {
        const url = new URL(text.trim());
        return url.protocol === "http:" || url.protocol === "https:" ? url : null;
    } catch {
        return null;
    }
};

type Props = {
    open: boolean;
    initialUrl: string;
    player: Player;
    onClose: () => void;
};

export const ImportDialog = ({ open, initialUrl, player, onClose }: Props) => {
    const [url, setUrl] = useState("");
    const [status, setStatus] = useState<Status>({ kind: "idle" });
    const [adding, setAdding] = useState(false);
    const latest = useRef(0);

    const link = parseLink(url);
    const platform = link ? (platforms.find((item) => item.matches(link)) ?? null) : null;

    useEffect(() => {
        if (!open) return;
        setUrl(initialUrl);
        setAdding(false);
        player.clearError();
    }, [open]);

    // As soon as the link is recognised it's looked up, after a short pause so typing doesn't fire a request per key;
    // an answer for an older link is ignored
    useEffect(() => {
        const request = ++latest.current;
        if (!link) return setStatus({ kind: "idle" });
        if (!platform) return setStatus({ kind: "unsupported" });

        setStatus({ kind: "fetching" });
        const timer = setTimeout(async () => {
            try {
                const response = await playerServiceClient.resolveLink({ url: link.href });
                if (request === latest.current) setStatus({ kind: "ready", title: response.title, tracks: response.tracks });
            } catch (error) {
                if (request === latest.current) setStatus({ kind: "error", message: describeError(error) });
            }
        }, constants.resolveDelay);

        return () => clearTimeout(timer);
    }, [url]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (status.kind !== "ready" || adding) return;

        setAdding(true);
        const added = await player.addTracks(status.tracks);
        setAdding(false);
        if (added) onClose();
    };

    const shown = platform ? [platform] : platforms;
    const tracks = status.kind === "ready" ? status.tracks : [];

    return (
        <Modal open={open} onClose={onClose} labelledBy="import-title">
            <form className="dialog-body" onSubmit={submit}>
                <div className="dialog-head">
                    <h2 id="import-title">Import from a link</h2>
                    <button type="button" className="icon-button small" onClick={onClose} aria-label="Close">
                        <X />
                    </button>
                </div>

                {/* With no link yet every supported site is shown; once one is recognised the others step aside
                    and it moves into focus */}
                <motion.div className={`platforms${platform ? " detected" : ""}`} layout transition={spring} aria-live="polite">
                    <AnimatePresence mode="popLayout" initial={false}>
                        {shown.map((item) => (
                            <motion.div
                                key={item.id}
                                className="platform-chip"
                                layout
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: platform ? 1.12 : 1 }}
                                exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
                                transition={spring}
                            >
                                <span className="platform-icon">
                                    <BrandIcon icon={item.icon} />
                                </span>
                                <span>{item.name}</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>

                <label className="field">
                    <span>Track, album or playlist link</span>
                    <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Paste a link…" required autoFocus />
                </label>

                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={status.kind}
                        className="import-status"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                        transition={{ duration: 0.2 }}
                    >
                        {status.kind === "idle" && <p className="muted">Paste a link from YouTube, SoundCloud or Spotify. Tracks, albums and playlists all work.</p>}
                        {status.kind === "unsupported" && (
                            <p className="field-error">
                                <AlertCircle aria-hidden="true" /> That site isn't supported. Use a YouTube, SoundCloud or Spotify link.
                            </p>
                        )}
                        {status.kind === "fetching" && (
                            <p className="fetching" role="status">
                                <span className="spinner" aria-hidden="true" /> Fetching…
                            </p>
                        )}
                        {status.kind === "error" && (
                            <p className="field-error" role="alert">
                                <AlertCircle aria-hidden="true" /> {status.message}
                            </p>
                        )}
                        {status.kind === "ready" && tracks.length === 1 && (
                            <div className="link-preview single">
                                <TrackCover track={tracks[0]} size="small" />
                                <span className="track-text">
                                    <span className="track-title">{tracks[0].title}</span>
                                    <span className="track-subtitle">{tracks[0].artist || "Unknown artist"}</span>
                                </span>
                                <span className="track-duration">{tracks[0].duration ? formatTime(tracks[0].duration) : ""}</span>
                            </div>
                        )}
                        {status.kind === "ready" && tracks.length > 1 && (
                            <div className="link-preview">
                                <p className="link-preview-title">
                                    <ListMusic aria-hidden="true" />
                                    <strong>{status.title || "Playlist"}</strong>
                                    <span className="muted">· {plural(tracks.length, "track", "tracks")}</span>
                                </p>
                                <ul>
                                    {tracks.slice(0, constants.importPreviewLength).map((track, index) => (
                                        <motion.li key={`${track.sourceId}-${index}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: index * 0.04 }}>
                                            <TrackCover track={track} size="small" />
                                            <span className="track-text">
                                                <span className="track-title">{track.title}</span>
                                                <span className="track-subtitle">{track.artist}</span>
                                            </span>
                                        </motion.li>
                                    ))}
                                </ul>
                                {tracks.length > constants.importPreviewLength && <p className="muted">and {tracks.length - constants.importPreviewLength} more</p>}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {player.error && (
                    <p className="field-error" role="alert">
                        {player.error}
                    </p>
                )}

                <div className="dialog-actions">
                    <button type="button" className="button ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <motion.button type="submit" className="button primary" disabled={status.kind !== "ready" || adding} layout transition={spring}>
                        {adding && <span className="spinner" aria-hidden="true" />}
                        {adding ? "Adding…" : tracks.length > 1 ? `Add ${tracks.length} tracks` : "Add to queue"}
                    </motion.button>
                </div>
            </form>
        </Modal>
    );
};
