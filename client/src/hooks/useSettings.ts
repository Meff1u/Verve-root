import { useEffect, useState } from "react";
import constants from "../constants";

export type Settings = typeof constants.defaultSettings;

// Per-device preferences: kept in localStorage, which can be missing (private mode), so failures fall back to defaults
const loadSettings = (): Settings => {
    try {
        return { ...constants.defaultSettings, ...JSON.parse(localStorage.getItem(constants.settingsKey) || "{}") };
    } catch {
        return constants.defaultSettings;
    }
};

export const useSettings = () => {
    const [settings, setSettings] = useState(loadSettings);

    useEffect(() => {
        try {
            localStorage.setItem(constants.settingsKey, JSON.stringify(settings));
        } catch {}
    }, [settings]);

    const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((current) => ({ ...current, [key]: value }));
    return { settings, update };
};
