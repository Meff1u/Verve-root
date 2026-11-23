import { FormEvent, useState } from "react";
import { ArrowRight, ListMusic, Plus, Search } from "lucide-react";
import { siSoundcloud, siSpotify, siYoutube } from "simple-icons";
import { Track } from "@verve/gen-shared";
import { BrandIcon } from "../components/BrandIcon";
import { PlayerCard } from "../components/PlayerCard";
import { TrackRow } from "../components/TrackRow";
import constants from "../constants";
import { Library } from "../hooks/useLibrary";
import { Player } from "../hooks/usePlayer";
import { isUrl } from "../utils/format";

const platforms = [
    { name: "Spotify", icon: siSpotify },
    { name: "YouTube", icon: siYoutube },
    { name: "SoundCloud", icon: siSoundcloud },
];

type Props = {
    player: Player;
    library: Library;
    nameOf: (userId: string) => string;
    visualizer: boolean;
    onAdd: (url?: string) => void;
    onShowQueue: () => void;
};

export const PlayerView = ({ player, library, nameOf, visualizer, onAdd, onShowQueue }: Props) => {
    const [query, setQuery] = useState("");
    const queue = player.state?.queue ?? [];
    const current = player.state?.current ?? -1;

    // Until platform search exists, text narrows the queue and a pasted link goes straight to the add dialog
    const searching = query.trim() !== "" && !isUrl(query);
    const matches = (track: Track) => `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(query.trim().toLowerCase());
    const rows = searching
        ? queue.map((track, index) => ({ track, index })).filter(({ track }) => matches(track))
        : queue.map((track, index) => ({ track, index })).slice(Math.max(current, 0), Math.max(current, 0) + constants.queuePreviewLength);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!isUrl(query)) return;
        onAdd(query.trim());
        setQuery("");
    };

    return (
        <div className="view player-view">
            <div className="toolbar">
                <form className="search" onSubmit={submit} role="search">
                    <Search aria-hidden="true" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search the queue or paste a link…"
                        aria-label="Search the queue or paste a track link"
                    />
                </form>
                <div className="toolbar-actions">
                    {platforms.map(({ name, icon }) => (
                        <button key={name} className="icon-button round platform" disabled aria-label={`${name} – coming soon`} title={`${name} – coming soon`}>
                            <BrandIcon icon={icon} />
                        </button>
                    ))}
                    <button className="icon-button round primary" onClick={() => onAdd()} aria-label="Add from link" title="Add from link">
                        <Plus />
                    </button>
                </div>
            </div>
            {searching && <p className="hint">Searching YouTube and Spotify is coming in the next stage. For now these are matches from the queue.</p>}

            <PlayerCard player={player} library={library} nameOf={nameOf} visualizer={visualizer} />

            <section className="card queue-preview" aria-labelledby="queue-preview-title">
                <div className="section-head">
                    <h2 id="queue-preview-title">
                        <ListMusic aria-hidden="true" />
                        {searching ? `Results (${rows.length})` : `Queue (${queue.length})`}
                    </h2>
                    <button className="link-button" onClick={onShowQueue}>
                        See all <ArrowRight aria-hidden="true" />
                    </button>
                </div>

                {!rows.length && <p className="empty">{searching ? "Nothing matches your search." : "The queue is empty. Add the first track with the + button."}</p>}
                <div className="track-list">
                    {rows.map(({ track, index }) => (
                        <TrackRow
                            key={track.id}
                            track={track}
                            subtitle={track.artist || `Added by ${nameOf(track.addedBy)}`}
                            status={index === current ? "current" : index < current ? "played" : "upcoming"}
                            playing={!!player.state?.playing}
                            duration={index === current ? player.duration : undefined}
                            onPlay={() => player.play(track.id)}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
};
