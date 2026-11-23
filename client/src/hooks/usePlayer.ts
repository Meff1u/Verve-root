import { useEffect, useRef, useState } from "react";
import { RootServerException } from "@rootsdk/client-app";
import { playerServiceClient, PlayerServiceClientEvent } from "@verve/gen-client";
import { PlayerError, PlayerState, StateChangedEvent, StateResponse } from "@verve/gen-shared";
import constants from "../constants";

const errorMessages: Record<number, string> = {
    [PlayerError.INVALID_URL]: "That link isn't an http(s) address",
    [PlayerError.TRACK_NOT_FOUND]: "That track is no longer in the queue",
    [PlayerError.QUEUE_FULL]: "The queue is full",
};

const loadVolume = () => {
    try {
        const saved = localStorage.getItem(constants.volumeKey);
        return saved === null ? constants.defaultVolume : Math.min(1, Math.max(0, Number(saved) || 0));
    } catch {
        return constants.defaultVolume;
    }
};

export type Player = ReturnType<typeof usePlayer>;

// The server owns the queue and the playback clock; this hook mirrors that state and keeps the local <audio>
// element in step with it, so every member hears the same track at the same moment
export const usePlayer = () => {
    const [state, setState] = useState<PlayerState | null>(null);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [blocked, setBlocked] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [volume, setVolume] = useState(loadVolume);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const stateRef = useRef<PlayerState | null>(null);
    const loadedTrack = useRef<string | null>(null);
    const clockOffset = useRef(0);

    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    // Where shared playback is right now, extrapolated from the last state with the server's clock
    const expectedPosition = (player: PlayerState) => {
        if (!player.playing) return player.position;
        return player.position + (Date.now() + clockOffset.current - player.updatedAt) / 1000;
    };

    // Reads everything from refs, because event listeners and the timer keep the version from the first render
    const align = () => {
        const player = stateRef.current;
        const track = player?.queue[player.current];

        if (!player || !track) {
            if (loadedTrack.current === null) return;
            loadedTrack.current = null;
            audio.pause();
            // load() after dropping src resets currentTime, otherwise a late timeupdate shows the old position again
            audio.removeAttribute("src");
            audio.load();
            setPosition(0);
            setDuration(0);
            return;
        }

        if (loadedTrack.current !== track.id) {
            loadedTrack.current = track.id;
            audio.src = track.url;
        }

        // Seeking before metadata is ignored on some platforms, so loadedmetadata runs align once more
        if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
            const target = expectedPosition(player);
            if (Math.abs(audio.currentTime - target) > constants.driftTolerance) audio.currentTime = target;
        }

        // Browsers refuse to start sound before the user has interacted with the page; the UI offers a button then
        if (player.playing && audio.paused) audio.play().then(() => setBlocked(false), () => setBlocked(true));
        else if (!player.playing && !audio.paused) audio.pause();
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
            // Checked by shape, not instanceof: the exception arrives as a different copy of RootServerException
            const code = (error as RootServerException | undefined)?.code;
            setError(errorMessages[typeof code === "number" ? code : 0] ?? "Something went wrong, try again");
            console.error(`Player action failed (code ${code}):`, error);
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
        const onTime = () => setPosition(audio.currentTime);
        const onMetadata = () => {
            setDuration(audio.duration || 0);
            align();
        };
        const onEnded = () => {
            const track = stateRef.current?.queue[stateRef.current.current];
            if (track) run(() => playerServiceClient.trackEnded({ trackId: track.id }));
        };
        const onError = () => {
            if (loadedTrack.current) setError("This track couldn't be loaded");
        };

        playerServiceClient.on(PlayerServiceClientEvent.StateChanged, onChanged);
        audio.addEventListener("timeupdate", onTime);
        audio.addEventListener("loadedmetadata", onMetadata);
        audio.addEventListener("ended", onEnded);
        audio.addEventListener("error", onError);

        // Catches slow drift (buffering, a throttled tab) without waiting for the next state change
        const timer = setInterval(align, constants.syncInterval);
        fetchState();

        return () => {
            playerServiceClient.off(PlayerServiceClientEvent.StateChanged, onChanged);
            audio.removeEventListener("timeupdate", onTime);
            audio.removeEventListener("loadedmetadata", onMetadata);
            audio.removeEventListener("ended", onEnded);
            audio.removeEventListener("error", onError);
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
        position,
        duration,
        blocked,
        error,
        volume,
        setVolume,
        unblock: () => audio.play().then(() => setBlocked(false), () => setBlocked(true)),
        add: async (url: string, title: string) => {
            // Checked here too, because the local dev host reports the server's own error codes as unhandled (-3)
            if (!/^https?:\/\//i.test(url.trim())) {
                setError(errorMessages[PlayerError.INVALID_URL]);
                return false;
            }
            return run(() => playerServiceClient.add({ url, title }));
        },
        remove: (trackId: string) => run(() => playerServiceClient.remove({ trackId })),
        play: (trackId = "") => run(() => playerServiceClient.play({ trackId })),
        pause: () => run(() => playerServiceClient.pause({})),
        seek: (seconds: number) => run(() => playerServiceClient.seek({ position: seconds })),
        next: () => run(() => playerServiceClient.next({})),
        previous: () => run(() => playerServiceClient.previous({})),
        shuffle: () => run(() => playerServiceClient.shuffle({})),
    };
};
