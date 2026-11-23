export default {
    volumeKey: "verve-volume",
    settingsKey: "verve-settings",
    defaultVolume: 0.5,
    // How far (seconds) local playback may wander from the shared position before it's pulled back with a seek
    driftTolerance: 0.75,
    syncInterval: 1000,
    queuePreviewLength: 4,
    defaultSettings: {
        visualizer: true,
        confirmRemove: false,
    },
};
