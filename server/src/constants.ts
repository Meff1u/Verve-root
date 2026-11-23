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
    matchToleranceSeconds: 15,
    soundcloudMatchCandidates: 8,
    // Covers go through the server because the client has no network of its own; one fits in a single message
    maxCoverBytes: 200 * 1024,
    maxCachedCovers: 300,
    coverTimeoutMs: 8000,
    coverHosts: ["ytimg.com", "googleusercontent.com", "ggpht.com", "sndcdn.com", "scdn.co", "spotifycdn.com"],
    // How long a new track waits at 0:00 for listeners to download it before starting anyway
    bufferTimeoutMs: 15000,
    // Pressing "previous" later than this many seconds into a track restarts it instead of going back
    restartThreshold: 3,
};
