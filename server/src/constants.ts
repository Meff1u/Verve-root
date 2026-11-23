export default {
    stateKey: "player-state",
    favoritesKey: "favorites",
    maxQueueLength: 200,
    maxImportTracks: 100,
    maxFavorites: 500,
    maxTitleLength: 120,
    maxQueryLength: 100,
    maxTrackSeconds: 20 * 60,
    maxAudioBytes: 60 * 1024 * 1024,
    // Root drops messages over 256 KiB, so audio goes out in pieces with room left for the envelope
    audioChunkBytes: 200 * 1024,
    youtubeClients: ["IOS", "YTMUSIC", "MWEB"] as const,
    youtubeEvalTimeoutMs: 5000,
    youtubeAlternatives: 3,
    matchToleranceSeconds: 15,
    spotifyMatchCandidates: 5,
    // How long a new track waits at 0:00 for listeners to download it before starting anyway
    bufferTimeoutMs: 15000,
    // Pressing "previous" later than this many seconds into a track restarts it instead of going back
    restartThreshold: 3,
};
