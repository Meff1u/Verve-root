export default {
    volumeKey: "verve-volume",
    settingsKey: "verve-settings",
    defaultVolume: 0.5,
    // How far (seconds) local playback may wander from the shared position before it's pulled back with a seek
    driftTolerance: 0.75,
    syncInterval: 1000,
    queuePreviewLength: 4,
    mobileBreakpoint: 860,
    searchDelay: 400,
    resolveDelay: 350,
    importPreviewLength: 5,
    chunkRetries: 4,
    // At most ~6 chunk requests a second (~1.2 MB/s), leaving room under Root's 10 requests/second for everything else
    chunkInterval: 160,
    chunkRetryDelay: 600,
    maxShownErrorLength: 120,
    defaultSettings: {
        confirmRemove: false,
    },
};
