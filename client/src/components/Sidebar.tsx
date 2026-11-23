import { motion } from "motion/react";
import { ListMusic, Library, LucideIcon, Play, Settings } from "lucide-react";
import { plural } from "../utils/format";
import { spring } from "../utils/motion";
import { Logo } from "./Logo";

export type Tab = "player" | "queue" | "library" | "settings";

export const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: "player", label: "Player", icon: Play },
    { id: "queue", label: "Queue", icon: ListMusic },
    { id: "library", label: "Library", icon: Library },
    { id: "settings", label: "Settings", icon: Settings },
];

type Props = {
    active: Tab;
    onChange: (tab: Tab) => void;
    connected: boolean;
    listeners: number;
};

// On narrow screens the same navigation turns into a bottom tab bar through CSS, so there's one source of truth.
// The highlight is a single shared element that glides from tab to tab instead of blinking between them
export const Sidebar = ({ active, onChange, connected, listeners }: Props) => (
    <aside className="sidebar">
        <div className="logo" aria-label="Verve">
            <Logo size={96} />
            <span>Verve</span>
        </div>

        <nav className="nav" aria-label="Main navigation">
            {tabs.map(({ id, label, icon: Icon }) => (
                <button key={id} className={`nav-item${active === id ? " active" : ""}`} onClick={() => onChange(id)} aria-current={active === id ? "page" : undefined}>
                    {active === id && <motion.span className="nav-highlight" layoutId="nav-highlight" transition={spring} />}
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                </button>
            ))}
        </nav>

        <div className="status">
            <span className={`status-dot${connected ? " online" : ""}`} aria-hidden="true" />
            {connected ? `Online · ${plural(listeners, "listener", "listeners")}` : "Connecting…"}
        </div>
    </aside>
);
