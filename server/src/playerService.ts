import { randomUUID } from "crypto";
import { Client, RootServerException, rootServer } from "@rootsdk/server-app";
import { PlayerServiceBase } from "@verve/gen-server";
import {
    AddRequest,
    GetStateResponse,
    PlayRequest,
    PlayerError,
    PlayerState,
    RemoveRequest,
    SeekRequest,
    StateResponse,
    TrackEndedRequest,
} from "@verve/gen-shared";
import constants from "./constants";

// One player per community: each community gets its own server instance, so module state is that community's player.
// current is -1 while idle (nothing loaded, or the queue played to the end)
const state: PlayerState = { queue: [], current: -1, playing: false, position: 0, updatedAt: Date.now() };

const positionNow = () => (state.playing ? state.position + (Date.now() - state.updatedAt) / 1000 : state.position);

const setPlayback = (playing: boolean, position: number) => {
    state.playing = playing;
    state.position = Math.max(0, position);
    state.updatedAt = Date.now();
};

const goTo = (index: number, playing: boolean) => {
    if (index < 0 || index >= state.queue.length) {
        state.current = -1;
        return setPlayback(false, 0);
    }

    state.current = index;
    setPlayback(playing, 0);
};

const findTrack = (trackId: string) => {
    const index = state.queue.findIndex((track) => track.id === trackId);
    if (index === -1) throw new RootServerException(PlayerError.TRACK_NOT_FOUND, "Track is not in the queue");
    return index;
};

// Without a title the file name stands in, e.g. ".../My%20Song.mp3" becomes "My Song"
const titleFrom = (url: URL, title: string) => {
    const fileName = decodeURIComponent(url.pathname.split("/").pop() || "").replace(/\.[a-z0-9]+$/i, "");
    return (title.trim() || fileName || url.hostname).slice(0, constants.maxTitleLength);
};

const parseUrl = (value: string) => {
    try {
        const url = new URL(value.trim());
        if (url.protocol === "http:" || url.protocol === "https:") return url;
    } catch {}

    throw new RootServerException(PlayerError.INVALID_URL, "Only http(s) links are supported");
};

export class PlayerService extends PlayerServiceBase {
    // A restart (deploy, crash) brings the queue back paused where it was, rather than guessing how far it got
    async load() {
        try {
            const saved = await rootServer.dataStore.appData.get<PlayerState>(constants.stateKey);
            if (!saved) return;

            Object.assign(state, saved);
            setPlayback(false, saved.position);
        } catch (error) {
            console.error("Loading player state failed:", error);
        }
    }

    // Saves and tells every other device; the caller gets the same state back in its response
    private commit(client?: Client): StateResponse {
        rootServer.dataStore.appData.set({ key: constants.stateKey, value: state }).catch((error) => console.error("Saving player state failed:", error));
        this.broadcastStateChanged({ state }, "all", client);
        return { state };
    }

    async getState(): Promise<GetStateResponse> {
        return { state, serverTime: Date.now() };
    }

    async add(request: AddRequest, client: Client): Promise<StateResponse> {
        const url = parseUrl(request.url);
        if (state.queue.length >= constants.maxQueueLength) throw new RootServerException(PlayerError.QUEUE_FULL, "The queue is full");

        state.queue.push({ id: randomUUID(), url: url.href, title: titleFrom(url, request.title), addedBy: client.userId });

        // Adding to an idle player starts the new track straight away, like a jukebox
        if (state.current === -1) goTo(state.queue.length - 1, true);
        return this.commit(client);
    }

    async remove(request: RemoveRequest, client: Client): Promise<StateResponse> {
        const index = findTrack(request.trackId);
        state.queue.splice(index, 1);

        // Removing the playing track moves on to whatever slid into its place
        if (index < state.current) state.current--;
        else if (index === state.current) goTo(index, state.playing);
        return this.commit(client);
    }

    async play(request: PlayRequest, client: Client): Promise<StateResponse> {
        if (request.trackId) {
            goTo(findTrack(request.trackId), true);
            return this.commit(client);
        }

        if (state.current === -1) goTo(0, true);
        else setPlayback(true, state.position);
        return this.commit(client);
    }

    async pause(_request: unknown, client: Client): Promise<StateResponse> {
        if (state.playing) setPlayback(false, positionNow());
        return this.commit(client);
    }

    async seek(request: SeekRequest, client: Client): Promise<StateResponse> {
        if (state.current !== -1) setPlayback(state.playing, request.position);
        return this.commit(client);
    }

    async next(_request: unknown, client: Client): Promise<StateResponse> {
        if (state.current !== -1) goTo(state.current + 1, state.playing);
        return this.commit(client);
    }

    async previous(_request: unknown, client: Client): Promise<StateResponse> {
        if (state.current === -1) goTo(state.queue.length - 1, false);
        else if (positionNow() > constants.restartThreshold || state.current === 0) setPlayback(state.playing, 0);
        else goTo(state.current - 1, state.playing);
        return this.commit(client);
    }

    // Shuffles only what's still ahead, so the playing track and history stay put (Fisher-Yates)
    async shuffle(_request: unknown, client: Client): Promise<StateResponse> {
        const start = state.current + 1;
        for (let i = state.queue.length - 1; i > start; i--) {
            const j = start + Math.floor(Math.random() * (i - start + 1));
            [state.queue[i], state.queue[j]] = [state.queue[j], state.queue[i]];
        }
        return this.commit(client);
    }

    // Every listening device reports the end, so only the first report for the playing track counts
    async trackEnded(request: TrackEndedRequest, client: Client): Promise<StateResponse> {
        if (!state.playing || state.queue[state.current]?.id !== request.trackId) return { state };

        goTo(state.current + 1, true);
        return this.commit(client);
    }
}

export const playerService = new PlayerService();
