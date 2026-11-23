import { CSSProperties } from "react";
import { motion } from "motion/react";
import { Player } from "../hooks/usePlayer";
import { viewVariants } from "../utils/motion";
import { Settings } from "../hooks/useSettings";
import packageJson from "../../package.json";

type Props = {
    player: Player;
    settings: Settings;
    onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

type ToggleProps = {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
};

const Toggle = ({ label, description, checked, onChange }: ToggleProps) => (
    <label className="setting">
        <span className="setting-text">
            <span className="setting-label">{label}</span>
            <span className="setting-description">{description}</span>
        </span>
        <input type="checkbox" role="switch" className="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
);

export const SettingsView = ({ player, settings, onChange }: Props) => (
    <motion.div className="view settings-view" variants={viewVariants} initial="hidden" animate="visible" exit="exit">
        <div className="view-head">
            <div>
                <h1>Settings</h1>
                <p className="muted">Saved on this device. They don't affect other listeners.</p>
            </div>
        </div>

        <section className="card settings-group" aria-labelledby="sound-title">
            <h2 id="sound-title">Sound</h2>
            <label className="setting">
                <span className="setting-text">
                    <span className="setting-label">Volume</span>
                    <span className="setting-description">Only for you, playback for everyone else stays the same.</span>
                </span>
                <span className="setting-value">
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={player.volume}
                        onChange={(event) => player.setVolume(Number(event.target.value))}
                        style={{ "--progress": `${player.volume * 100}%` } as CSSProperties}
                    />
                    <output>{Math.round(player.volume * 100)}%</output>
                </span>
            </label>
        </section>

        <section className="card settings-group" aria-labelledby="look-title">
            <h2 id="look-title">Look and behavior</h2>
            <Toggle
                label="Visualizer"
                description="Animated bars next to the player. They stay still when reduced motion is on in your system."
                checked={settings.visualizer}
                onChange={(checked) => onChange("visualizer", checked)}
            />
            <Toggle
                label="Confirm removing"
                description="Ask before a track is removed from the queue."
                checked={settings.confirmRemove}
                onChange={(checked) => onChange("confirmRemove", checked)}
            />
        </section>

        <section className="card settings-group" aria-labelledby="about-title">
            <h2 id="about-title">About</h2>
            <p className="muted">
                Verve v{packageJson.version} · a shared music player for Root communities. Everyone listens on their own device while the queue and playback position stay in sync.
                Search uses YouTube Music and SoundCloud; Spotify links are matched to YouTube Music.
            </p>
        </section>
    </motion.div>
);
