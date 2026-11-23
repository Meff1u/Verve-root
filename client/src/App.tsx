import { useEffect, useState } from "react";
import { X } from "lucide-react";
// Bundled instead of Google Fonts, because the Root client can't load anything from the network;
// latin-ext covers accented letters in track titles (ą, é, ø…), other scripts are left out to keep the package small
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import "@fontsource/poppins/latin-ext-400.css";
import "@fontsource/poppins/latin-ext-500.css";
import "@fontsource/poppins/latin-ext-600.css";
import "@fontsource/poppins/latin-ext-700.css";
import { AddTrackDialog } from "./components/AddTrackDialog";
import { Sidebar, Tab, tabs } from "./components/Sidebar";
import { useLibrary } from "./hooks/useLibrary";
import { useNicknames } from "./hooks/useNicknames";
import { usePlayer } from "./hooks/usePlayer";
import { useSettings } from "./hooks/useSettings";
import { LibraryView } from "./views/LibraryView";
import { PlayerView } from "./views/PlayerView";
import { QueueView } from "./views/QueueView";
import { SettingsView } from "./views/SettingsView";
import "./styles.css";

// The tab lives in the URL hash, so a reload (Root restarts clients after network loss) returns to the same view
const tabFromHash = (): Tab => tabs.find((tab) => `#${tab.id}` === location.hash)?.id ?? "player";

const App = () => {
    const player = usePlayer();
    const library = useLibrary();
    const { settings, update } = useSettings();
    const nameOf = useNicknames(player.state?.queue.map((track) => track.addedBy) ?? []);
    const [tab, setTab] = useState(tabFromHash);
    const [adding, setAdding] = useState<{ url: string } | null>(null);

    useEffect(() => {
        history.replaceState(null, "", `#${tab}`);
    }, [tab]);

    const openAdd = (url = "") => {
        player.clearError();
        setAdding({ url });
    };

    return (
        <div className="app">
            <Sidebar active={tab} onChange={setTab} connected={!!player.state} listeners={player.state?.listeners ?? 0} />

            <main className="content">
                {player.error && !adding && (
                    <div className="banner error" role="alert">
                        {player.error}
                        <button className="icon-button small" onClick={player.clearError} aria-label="Dismiss message">
                            <X />
                        </button>
                    </div>
                )}
                {player.blocked && (
                    <button className="banner join" onClick={player.unblock}>
                        Playback is running – click to listen along
                    </button>
                )}

                {tab === "player" && <PlayerView player={player} library={library} nameOf={nameOf} visualizer={settings.visualizer} onAdd={openAdd} onShowQueue={() => setTab("queue")} />}
                {tab === "queue" && <QueueView player={player} nameOf={nameOf} confirmRemove={settings.confirmRemove} onAdd={() => openAdd()} />}
                {tab === "library" && <LibraryView player={player} library={library} />}
                {tab === "settings" && <SettingsView player={player} settings={settings} onChange={update} />}
            </main>

            <AddTrackDialog open={!!adding} initialUrl={adding?.url ?? ""} player={player} onClose={() => setAdding(null)} />
        </div>
    );
};

export default App;
