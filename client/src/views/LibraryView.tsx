import { Heart, ListPlus, ListVideo } from "lucide-react";
import { TrackCover } from "../components/TrackCover";
import { Library } from "../hooks/useLibrary";
import { Player } from "../hooks/usePlayer";

type Props = {
    player: Player;
    library: Library;
};

export const LibraryView = ({ player, library }: Props) => (
    <div className="view library-view">
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

            <div className="gallery">
                {library.favorites.map((track) => (
                    <article key={track.url} className="tile">
                        <TrackCover track={track} size="medium" />
                        <div className="tile-text">
                            <h3>{track.title}</h3>
                            <p>{track.artist || "Unknown artist"}</p>
                        </div>
                        <div className="tile-actions">
                            <button className="icon-button small" onClick={() => player.add(track.url, track.title, track.artist)} aria-label={`Add to queue: ${track.title}`} title="Add to queue">
                                <ListPlus />
                            </button>
                            <button className="icon-button small active" onClick={() => library.toggleFavorite(track)} aria-label={`Remove from favorites: ${track.title}`} title="Remove from favorites">
                                <Heart fill="currentColor" />
                            </button>
                        </div>
                    </article>
                ))}
            </div>
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
    </div>
);
