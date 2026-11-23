import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Link2, ListMusic, Plus, Search, X } from "lucide-react";
import { siSoundcloud, siSpotify, siYoutubemusic } from "simple-icons";
import { Source, Track } from "@verve/gen-shared";
import { BrandIcon } from "../components/BrandIcon";
import { PlayerCard } from "../components/PlayerCard";
import { TrackCover } from "../components/TrackCover";
import { TrackRow } from "../components/TrackRow";
import constants from "../constants";
import { Library } from "../hooks/useLibrary";
import { Player } from "../hooks/usePlayer";
import { useSearch } from "../hooks/useSearch";
import { formatTime, isUrl } from "../utils/format";
import { listVariants, rowVariants, spring, tap, viewVariants } from "../utils/motion";

const searchSources = [
    { source: Source.YOUTUBE, label: "YouTube Music", icon: siYoutubemusic },
    { source: Source.SOUNDCLOUD, label: "SoundCloud", icon: siSoundcloud },
];

type Props = {
    player: Player;
    library: Library;
    nameOf: (userId: string) => string;
    visualizer: boolean;
    onImport: () => void;
    onShowQueue: () => void;
};

export const PlayerView = ({ player, library, nameOf, visualizer, onImport, onShowQueue }: Props) => {
    const [query, setQuery] = useState("");
    const [source, setSource] = useState(Source.YOUTUBE);
    // Remembers what was added from these results, so its button turns into a check instead of adding twice
    const [added, setAdded] = useState<Set<string>>(new Set());
    const [importing, setImporting] = useState(false);

    // A pasted link isn't searched; Enter imports it straight away
    const pastedLink = isUrl(query);
    const search = useSearch(pastedLink ? "" : query, source);
    const showResults = query.trim() !== "" && !pastedLink;

    const queue = player.state?.queue ?? [];
    const current = player.state?.current ?? -1;
    const preview = queue.map((track, index) => ({ track, index })).slice(Math.max(current, 0), Math.max(current, 0) + constants.queuePreviewLength);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!pastedLink || importing) return;

        setImporting(true);
        if (await player.importLink(query.trim())) setQuery("");
        setImporting(false);
    };

    const add = async (track: Track) => {
        const key = `${track.source}:${track.sourceId}`;
        if (added.has(key)) return;

        setAdded((keys) => new Set(keys).add(key));
        if (!(await player.addTracks([track]))) {
            setAdded((keys) => {
                const next = new Set(keys);
                next.delete(key);
                return next;
            });
        }
    };

    return (
        <motion.div className="view player-view" variants={viewVariants} initial="hidden" animate="visible" exit="exit">
            <div className="toolbar">
                <form className="search" onSubmit={submit} role="search">
                    <Search aria-hidden="true" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search songs, artists, albums… or paste a link"
                        aria-label="Search songs or paste a YouTube, SoundCloud or Spotify link"
                    />
                    <AnimatePresence>
                        {(search.searching || importing) && (
                            <motion.span key="spinner" className="spinner" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} aria-hidden="true" />
                        )}
                        {pastedLink && !importing && (
                            <motion.button key="import" type="submit" className="button primary small" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                                <Link2 aria-hidden="true" /> Import
                            </motion.button>
                        )}
                        {query && !pastedLink && (
                            <motion.button key="clear" type="button" className="icon-button small" onClick={() => setQuery("")} aria-label="Clear search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <X />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </form>

                <div className="toolbar-actions">
                    <div className="segmented" role="radiogroup" aria-label="Search on">
                        {searchSources.map((item) => (
                            <button
                                key={item.source}
                                role="radio"
                                aria-checked={source === item.source}
                                className={`segment${source === item.source ? " active" : ""}`}
                                onClick={() => setSource(item.source)}
                                title={`Search on ${item.label}`}
                                aria-label={`Search on ${item.label}`}
                            >
                                {source === item.source && <motion.span className="segment-highlight" layoutId="search-source" transition={spring} />}
                                <BrandIcon icon={item.icon} />
                            </button>
                        ))}
                    </div>
                    <motion.button className="icon-button round platform" onClick={onImport} aria-label="Import from Spotify" title="Import a Spotify track, album or playlist" whileTap={tap}>
                        <BrandIcon icon={siSpotify} />
                    </motion.button>
                    <motion.button className="icon-button round primary" onClick={onImport} aria-label="Import from a link" title="Import from a YouTube, SoundCloud or Spotify link" whileTap={tap}>
                        <Link2 />
                    </motion.button>
                </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
                {showResults ? (
                    <motion.section
                        key="results"
                        className="card results"
                        aria-labelledby="results-title"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.22 }}
                    >
                        <div className="section-head">
                            <h2 id="results-title">
                                <Search aria-hidden="true" />
                                Results on {searchSources.find((item) => item.source === source)?.label}
                            </h2>
                        </div>

                        {search.error && <p className="empty">{search.error}</p>}
                        {!search.error && !search.searching && !search.results.length && <p className="empty">Nothing found. Try other words or the other platform.</p>}
                        {search.searching && !search.results.length && (
                            <div className="track-list" aria-hidden="true">
                                {Array.from({ length: 5 }, (_, i) => (
                                    <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 0.08}s` }} />
                                ))}
                            </div>
                        )}

                        <motion.div className={`track-list${search.searching ? " refreshing" : ""}`} variants={listVariants} initial="hidden" animate="visible" key={search.results.map((track) => track.sourceId).join()}>
                            {search.results.map((track) => {
                                const isAdded = added.has(`${track.source}:${track.sourceId}`);
                                return (
                                    <motion.div key={`${track.source}:${track.sourceId}`} className="result-row" variants={rowVariants}>
                                        <TrackCover track={track} size="small" />
                                        <span className="track-text">
                                            <span className="track-title">{track.title}</span>
                                            <span className="track-subtitle">{[track.artist, track.album].filter(Boolean).join(" · ")}</span>
                                        </span>
                                        <span className="track-duration">{track.duration ? formatTime(track.duration) : ""}</span>
                                        <motion.button
                                            className={`icon-button small add-button${isAdded ? " added" : ""}`}
                                            onClick={() => add(track)}
                                            aria-label={isAdded ? `Added: ${track.title}` : `Add to queue: ${track.title}`}
                                            whileTap={tap}
                                        >
                                            <AnimatePresence mode="popLayout" initial={false}>
                                                <motion.span key={String(isAdded)} className="icon-pop" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={spring}>
                                                    {isAdded ? <Check /> : <Plus />}
                                                </motion.span>
                                            </AnimatePresence>
                                        </motion.button>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </motion.section>
                ) : (
                    <motion.div key="player" className="view" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                        <PlayerCard player={player} library={library} nameOf={nameOf} visualizer={visualizer} />

                        <section className="card queue-preview" aria-labelledby="queue-preview-title">
                            <div className="section-head">
                                <h2 id="queue-preview-title">
                                    <ListMusic aria-hidden="true" />
                                    Queue ({queue.length})
                                </h2>
                                <button className="link-button" onClick={onShowQueue}>
                                    See all <ArrowRight aria-hidden="true" />
                                </button>
                            </div>

                            {!preview.length && <p className="empty">The queue is empty. Search for a song above or import a playlist.</p>}
                            <motion.div className="track-list" layout>
                                <AnimatePresence initial={false}>
                                    {preview.map(({ track, index }) => (
                                        <motion.div key={track.id} layout variants={rowVariants} initial="hidden" animate="visible" exit="exit">
                                            <TrackRow
                                                track={track}
                                                subtitle={track.artist || `Added by ${nameOf(track.addedBy)}`}
                                                status={index === current ? "current" : index < current ? "played" : "upcoming"}
                                                playing={!!player.state?.playing}
                                                duration={index === current ? player.duration : undefined}
                                                onPlay={() => player.play(track.id)}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        </section>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
