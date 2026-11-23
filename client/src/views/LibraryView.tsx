import { AnimatePresence, motion } from "motion/react";
import { Heart, ListPlus, ListVideo } from "lucide-react";
import { SourceBadge } from "../components/SourceBadge";
import { TrackCover } from "../components/TrackCover";
import { Library } from "../hooks/useLibrary";
import { Player } from "../hooks/usePlayer";
import { listVariants, spring, tap, viewVariants } from "../utils/motion";

type Props = {
    player: Player;
    library: Library;
};

export const LibraryView = ({ player, library }: Props) => (
    <motion.div className="view library-view" variants={viewVariants} initial="hidden" animate="visible" exit="exit">
        <div className="view-head">
            <div>
                <h1>Library</h1>
                <p className="muted">Your saved tracks. Only you can see them.</p>
            </div>
        </div>

        <section aria-labelledby="favorites-title">
            <h2 id="favorites-title" className="section-title">
                <Heart aria-hidden="true" /> Favorites ({library.favorites.length})
            </h2>

            {library.loaded && !library.favorites.length && (
                <div className="card empty-state">
                    <Heart aria-hidden="true" />
                    <p>No favorites yet. Tap the heart on the playing track to save it here.</p>
                </div>
            )}

            <motion.div className="gallery" variants={listVariants} initial="hidden" animate="visible" layout>
                <AnimatePresence>
                    {library.favorites.map((track) => (
                        <motion.article
                            key={track.url}
                            className="tile"
                            layout
                            variants={{ hidden: { opacity: 0, scale: 0.9, y: 12 }, visible: { opacity: 1, scale: 1, y: 0, transition: spring } }}
                            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                            whileHover={{ y: -4 }}
                        >
                            <TrackCover track={track} size="medium" />
                            <div className="tile-text">
                                <h3>{track.title}</h3>
                                <p>
                                    <SourceBadge source={track.source} />
                                    {track.artist || "Unknown artist"}
                                </p>
                            </div>
                            <div className="tile-actions">
                                <motion.button className="icon-button small" onClick={() => player.addTracks([track])} aria-label={`Add to queue: ${track.title}`} title="Add to queue" whileTap={tap}>
                                    <ListPlus />
                                </motion.button>
                                <motion.button
                                    className="icon-button small active"
                                    onClick={() => library.toggleFavorite(track)}
                                    aria-label={`Remove from favorites: ${track.title}`}
                                    title="Remove from favorites"
                                    whileTap={tap}
                                >
                                    <Heart fill="currentColor" />
                                </motion.button>
                            </div>
                        </motion.article>
                    ))}
                </AnimatePresence>
            </motion.div>
        </section>

        <section aria-labelledby="playlists-title">
            <h2 id="playlists-title" className="section-title">
                <ListVideo aria-hidden="true" /> Playlists
            </h2>
            <div className="card empty-state">
                <ListVideo aria-hidden="true" />
                <p>Playlists are coming in the next stage.</p>
            </div>
        </section>
    </motion.div>
);
