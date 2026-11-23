import { CSSProperties } from "react";

const bars = [0.55, 0.8, 0.4, 0.95, 0.65, 0.3, 0.85, 0.5, 0.7, 0.35, 0.9, 0.6];

// Decorative only: real audio analysis would need CORS headers from every source, and without them
// the browser silences the track, so the bars just dance while something plays
export const Visualizer = ({ active }: { active: boolean }) => (
    <div className={`visualizer${active ? " active" : ""}`} aria-hidden="true">
        {bars.map((height, i) => (
            <span key={i} style={{ "--height": height, "--delay": `${(i % 5) * -0.18}s` } as CSSProperties} />
        ))}
    </div>
);
