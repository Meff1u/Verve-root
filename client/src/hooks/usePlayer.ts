import { useEffect, useRef, useState } from "react";
import { RootServerException } from "@rootsdk/client-app";
import { playerServiceClient, PlayerServiceClientEvent } from "@verve/gen-client";
import { PlayerError, PlayerState, RepeatMode, StateChangedEvent, StateResponse, Track } from "@verve/gen-shared";
import constants from "../constants";
import { loadAudio, onAudioProgress, releaseAudio } from "../utils/audioLoader";

const errorMessages: Record<number, string> = {
    [PlayerError.UNSUPPORTED_LINK]: "Only YouTube, SoundCloud and Spotify links work here",
    [PlayerError.TRACK_NOT_FOUND]: "That track is no longer in the queue",
    [PlayerError.QUEUE_FULL]: "The queue is full",
    [PlayerError.SOURCE_FAILED]: "Couldn't reach that platform, try again in a moment",
};

const nextRepeat: Record<RepeatMode, RepeatMode> = {
    [RepeatMode.OFF]: RepeatMode.ALL,
    [RepeatMode.ALL]: RepeatMode.ONE,
    [RepeatMode.ONE]: RepeatMode.OFF,
};

const loadVolume = () => {
    try {
        const saved = localStorage.getItem(constants.volumeKey);
        return saved === null ? constants.defaultVolume : Math.min(1, Math.max(0, Number(saved) || 0));
    } catch {
        return constants.defaultVolume;
    }
};

// Known codes get a friendly text; otherwise the server's own message is shown (the local dev host reports every
// server error as unhandled, -3, but keeps the message), and only a long technical one falls back to a generic line
export const describeError = (error: unknown) => {
    const { code, message } = (error ?? {}) as RootServerException;
    if (typeof code === "number" && errorMessages[code]) return errorMessages[code];
    return message && message.length <= constants.maxShownErrorLength ? message : "Something went wrong, try again";
};

export type Player = ReturnType<typeof usePlayer>;

// The server owns the queue and the playback clock; this hook mirrors that state and keeps the local <audio>
// element in step with it, so every member hears the same track at the same moment
export const usePlayer = () => {
    const [state, setState] = useState<PlayerState | null>(null);
    const [duration, setDuration] = useState(0);
    const [loading, setLoading] = useState<number | null>(null);
    const [blocked, setBlocked] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [volume, setVolume] = useState(loadVolume);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const stateRef = useRef<PlayerState | null>(null);
    const loadedTrack = useRef<string | null>(null);
    const reportedReady = useRef<string | null>(null);
    const clockOffset = useRef(0);

    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    // Read straight from the element, so the seek bar can animate every frame without re-rendering the whole app;
    // kept in a ref so its identity never changes and the bar's animation loop isn't restarted on every render
    const getPosition = useRef(() => (audio.getAttribute("src") ? audio.currentTime : 0)).current;

    // Where shared playback is right now, extrapolated from the last state with the server's clock; a buffering
    // track stays where it is, because its clock hasn't started yet
    const expectedPosition = (player: PlayerState) => {
        if (!player.playing || player.buffering) return player.position;
        return player.position + (Date.now() + clockOffset.current - player.updatedAt) / 1000;
    };

    const clearAudio = () => {
        audio.pause();
        // load() after dropping src resets currentTime, otherwise a late timeupdate shows the old position again
        audio.removeAttribute("src");
        audio.load();
    };

    // The next track is fetched in the background, so moving on doesn't wait for a download
    const prefetchNext = (player: PlayerState) => {
        const current = player.queue[player.current];
        const nextIndex = player.current >= player.queue.length - 1 && player.repeat === RepeatMode.ALL ? 0 : player.current + 1;
        const next = player.queue[nextIndex];

        releaseAudio([current?.id, next?.id].filter((id): id is string => !!id));
        if (next && next !== current) loadAudio(next.id).catch(() => {});
    };

    // Reads everything from refs, because event listeners and the timer keep the version from the first render
    const align = () => {
        const player = stateRef.current;
        const track = player?.queue[player.current];

        if (!player || !track) {
            if (loadedTrack.current === null) return;
            loadedTrack.current = null;
            clearAudio();
            setDuration(0);
            setLoading(null);
            return;
        }

        if (loadedTrack.current !== track.id) {
            loadedTrack.current = track.id;
            clearAudio();
            setDuration(track.duration);
            setLoading(0);

            loadAudio(track.id).then(
                (url) => {
                    if (loadedTrack.current !== track.id) return;
                    audio.src = url;
                    setLoading(null);
                    if (stateRef.current) prefetchNext(stateRef.current);
                    align();
                },
                (error) => {
                    if (loadedTrack.current !== track.id) return;
                    setLoading(null);
                    setError(describeError(error));
                },
            );
            return;
        }

        // Nothing to line up until the audio has arrived
        if (!audio.getAttribute("src")) return;

        // Seeking before metadata is ignored on some platforms, so loadedmetadata runs align once more
        if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
            const target = expectedPosition(player);
            if (Math.abs(audio.currentTime - target) > constants.driftTolerance) audio.currentTime = target;

            // This device has the audio: tell the server once, so the track can start for everyone from 0:00
            if (player.buffering && reportedReady.current !== track.id) {
                reportedReady.current = track.id;
                playerServiceClient.trackReady({ trackId: track.id }).then((response) => applyState(response.state), () => {});
            }
        }
        if (!player.buffering) reportedReady.current = null;

        // Browsers refuse to start sound before the user has interacted with the page; the UI offers a button then
        const shouldPlay = player.playing && !player.buffering;
        if (shouldPlay && audio.paused) audio.play().then(() => setBlocked(false), () => setBlocked(true));
        else if (!shouldPlay && !audio.paused) audio.pause();
    };

    const applyState = (player: PlayerState | undefined) => {
        if (!player) return;
        stateRef.current = player;
        setState(player);
        align();
    };

    // Every action answers with the new state, so it's applied at once instead of waiting for the broadcast
    const run = async (action: () => Promise<StateResponse>) => {
        try {
            const response = await action();
            setError(null);
            applyState(response.state);
            return true;
        } catch (error) {
            setError(describeError(error));
            console.error("Player action failed:", error);
            return false;
        }
    };

    // The offset assumes the request and the response took equally long, which is close enough for music
    const fetchState = async () => {
        try {
            const sentAt = Date.now();
            const response = await playerServiceClient.getState({});
            clockOffset.current = response.serverTime - (sentAt + Date.now()) / 2;
            applyState(response.state);
        } catch (error) {
            setError("Couldn't load the player");
            console.error("Loading player state failed:", error);
        }
    };

    useEffect(() => {
        const onChanged = (event: StateChangedEvent) => applyState(event.state);
        const onMetadata = () => {
            setDuration(audio.duration || stateRef.current?.queue[stateRef.current.current]?.duration || 0);
            align();
        };
        const onEnded = () => {
            const track = stateRef.current?.queue[stateRef.current.current];
            if (track) run(() => playerServiceClient.trackEnded({ trackId: track.id }));
        };
        const onError = () => {
            if (audio.getAttribute("src")) setError("This track couldn't be played");
        };
        const stopProgress = onAudioProgress((trackId, progress) => {
            if (trackId === loadedTrack.current && !audio.getAttribute("src")) setLoading(progress);
        });

        playerServiceClient.on(PlayerServiceClientEvent.StateChanged, onChanged);
        audio.addEventListener("loadedmetadata", onMetadata);
        audio.addEventListener("ended", onEnded);
        audio.addEventListener("error", onError);

        // Catches slow drift (buffering, a throttled tab) without waiting for the next state change
        const timer = setInterval(align, constants.syncInterval);
        fetchState();

        return () => {
            playerServiceClient.off(PlayerServiceClientEvent.StateChanged, onChanged);
            audio.removeEventListener("loadedmetadata", onMetadata);
            audio.removeEventListener("ended", onEnded);
            audio.removeEventListener("error", onError);
            stopProgress();
            clearInterval(timer);
            audio.pause();
        };
    }, []);

    useEffect(() => {
        audio.volume = volume;
        try {
            localStorage.setItem(constants.volumeKey, String(volume));
        } catch {}
    }, [volume]);

    return {
        state,
        currentTrack: state?.queue[state.current] ?? null,
        duration,
        loading,
        // The audio is here, but the track waits at 0:00 for the other listeners
        waiting: loading === null && !!state?.buffering,
        blocked,
        error,
        volume,
        setVolume,
        getPosition,
        unblock: () => audio.play().then(() => setBlocked(false), () => setBlocked(true)),
        addTracks: (tracks: Track[]) => run(() => playerServiceClient.addTracks({ tracks })),
        remove: (trackId: string) => run(() => playerServiceClient.remove({ trackId })),
        play: (trackId = "") => run(() => playerServiceClient.play({ trackId })),
        pause: () => run(() => playerServiceClient.pause({})),
        seek: (seconds: number) => run(() => playerServiceClient.seek({ position: seconds })),
        next: () => run(() => playerServiceClient.next({})),
        previous: () => run(() => playerServiceClient.previous({})),
        shuffle: () => run(() => playerServiceClient.shuffle({})),
        clear: () => run(() => playerServiceClient.clear({})),
        move: (trackId: string, toIndex: number) => run(() => playerServiceClient.move({ trackId, toIndex })),
        cycleRepeat: () => run(() => playerServiceClient.setRepeat({ repeat: nextRepeat[stateRef.current?.repeat ?? RepeatMode.OFF] })),
        clearError: () => setError(null),
    };
};
