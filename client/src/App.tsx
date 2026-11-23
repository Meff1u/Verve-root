import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
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
import { ImportDialog } from "./components/ImportDialog";
import { MiniPlayer } from "./components/MiniPlayer";
import { useIsMobile } from "./hooks/useIsMobile";
import { Sidebar, Tab, tabs } from "./components/Sidebar";
import { useLibrary } from "./hooks/useLibrary";
import { useNicknames } from "./hooks/useNicknames";
import { usePlayer } from "./hooks/usePlayer";
import { useSettings } from "./hooks/useSettings";
import { spring } from "./utils/motion";
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
    const mobile = useIsMobile();
    // null while the import dialog is closed; otherwise the link it opens with (empty when opened from the button)
    const [importUrl, setImportUrl] = useState<string | null>(null);
    const importing = importUrl !== null;

    useEffect(() => {
        history.replaceState(null, "", `#${tab}`);
    }, [tab]);

    const openImport = (url = "") => setImportUrl(url);

    // reducedMotion="user" turns every motion animation into an instant change when the system asks for less movement
    return (
        <MotionConfig reducedMotion="user" transition={spring}>
            <div className={`app${mobile && tab !== "player" && player.currentTrack ? " with-mini-player" : ""}`}>
                <Sidebar active={tab} onChange={setTab} connected={!!player.state} listeners={player.state?.listeners ?? 0} />

                <main className="content">
                    <AnimatePresence>
                        {player.error && !importing && (
                            <motion.div className="banner error" role="alert" initial={{ opacity: 0, y: -12, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -12, height: 0 }}>
                                {player.error}
                                <button className="icon-button small" onClick={player.clearError} aria-label="Dismiss message">
                                    <X />
                                </button>
                            </motion.div>
                        )}
                        {player.blocked && (
                            <motion.button className="banner join" onClick={player.unblock} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
                                Playback is running – click to listen along
                            </motion.button>
                        )}
                    </AnimatePresence>

                    <AnimatePresence mode="wait" initial={false}>
                        {tab === "player" && (
                            <PlayerView key="player" player={player} library={library} nameOf={nameOf} onImport={openImport} onShowQueue={() => setTab("queue")} />
                        )}
                        {tab === "queue" && <QueueView key="queue" player={player} nameOf={nameOf} confirmRemove={settings.confirmRemove} onImport={() => openImport()} />}
                        {tab === "library" && <LibraryView key="library" player={player} library={library} />}
                        {tab === "settings" && <SettingsView key="settings" player={player} settings={settings} onChange={update} />}
                    </AnimatePresence>
                </main>

                <AnimatePresence>{mobile && tab !== "player" && player.currentTrack && <MiniPlayer key="mini" player={player} onOpen={() => setTab("player")} />}</AnimatePresence>

                <ImportDialog open={importing} initialUrl={importUrl ?? ""} player={player} onClose={() => setImportUrl(null)} />
            </div>
        </MotionConfig>
    );
};

export default App;
