import { NowPlaying } from "./components/NowPlaying";
import { Queue } from "./components/Queue";
import { useNicknames } from "./hooks/useNicknames";
import { usePlayer } from "./hooks/usePlayer";
import "./styles.css";

const App = () => {
    const player = usePlayer();
    const nameOf = useNicknames(player.state?.queue.map((track) => track.addedBy) ?? []);

    return (
        <main className="app">
            {player.error && <div className="banner error">{player.error}</div>}
            {player.blocked && (
                <button className="banner join" onClick={player.unblock}>
                    Playback is running – click to listen
                </button>
            )}
            <NowPlaying player={player} nameOf={nameOf} />
            <Queue player={player} nameOf={nameOf} />
        </main>
    );
};

export default App;
