import { randomUUID } from "crypto";
import { Client, ClientEvent, RootServerException, rootServer } from "@rootsdk/server-app";
import { PlayerServiceBase } from "@verve/gen-server";
import {
    AddTracksRequest,
    GetAudioRequest,
    GetAudioResponse,
    GetStateResponse,
    MoveRequest,
    PlayRequest,
    PlayerError,
    PlayerState,
    RemoveRequest,
    RepeatMode,
    ResolveLinkRequest,
    ResolveLinkResponse,
    SearchRequest,
    SearchResponse,
    SeekRequest,
    SetRepeatRequest,
    Source,
    StateResponse,
    Track,
    TrackEndedRequest,
    TrackReadyRequest,
} from "@verve/gen-shared";
import { getAudioChunk, prepareAudio, retainAudio } from "./audioCache";
import constants from "./constants";
import { importLink, search } from "./sources";
import { Audio, emptyTrack, LinkContents, makeTrack } from "./sources/track";

// One player per community: each community gets its own server instance, so module state is that community's player.
// current is -1 while idle (nothing loaded, or the queue played to the end)
const state: PlayerState = {
    queue: [],
    current: -1,
    playing: false,
    position: 0,
    updatedAt: Date.now(),
    repeat: RepeatMode.OFF,
    listeners: 0,
    buffering: false,
};

// Counts downloads that failed in a row, so a queue where nothing can be fetched stops instead of skipping forever
let failedInARow = 0;

// While a new track is buffering: which track, who already has its audio, and the timer that starts it anyway
const buffer = { trackId: "", ready: new Set<string>(), timer: undefined as NodeJS.Timeout | undefined };

const positionNow = () => (state.playing && !state.buffering ? state.position + (Date.now() - state.updatedAt) / 1000 : state.position);

// Any explicit change of playback (pause, seek, resume) ends buffering; only switching tracks starts it
const setPlayback = (playing: boolean, position: number) => {
    state.playing = playing;
    state.buffering = false;
    state.position = Math.max(0, position);
    state.updatedAt = Date.now();
};

// A track that should play doesn't start its clock yet: it buffers at 0:00 until listeners have downloaded it
const goTo = (index: number, playing: boolean) => {
    if (index < 0 || index >= state.queue.length) {
        state.current = -1;
        return setPlayback(false, 0);
    }

    state.current = index;
    setPlayback(playing, 0);
    state.buffering = playing;
};

// With repeat-all the queue wraps around instead of going idle after the last track
const nextIndex = () => (state.current >= state.queue.length - 1 && state.repeat === RepeatMode.ALL ? 0 : state.current + 1);

const goToNext = (playing: boolean) => goTo(nextIndex(), playing);

const findTrack = (trackId: string) => {
    const index = state.queue.findIndex((track) => track.id === trackId);
    if (index === -1) throw new RootServerException(PlayerError.TRACK_NOT_FOUND, "Track is not in the queue");
    return index;
};

const fail = (code: PlayerError, message: string, error?: unknown) => {
    if (error) console.error(message, error);
    return new RootServerException(code, message);
};

const sources = [Source.YOUTUBE, Source.SOUNDCLOUD, Source.SPOTIFY];

// Tracks from clients come from search results, but they're rebuilt field by field so nothing unexpected gets stored
const fromClient = (track: Track, userId: string) =>
    makeTrack({
        id: randomUUID(),
        addedBy: userId,
        source: track.source,
        sourceId: track.sourceId.slice(0, 200),
        url: track.url.slice(0, 500),
        title: track.title,
        artist: track.artist,
        album: track.album.slice(0, constants.maxTitleLength),
        year: track.year,
        duration: Math.max(0, track.duration),
        coverUrl: track.coverUrl.startsWith("https://") ? track.coverUrl.slice(0, 500) : "",
    });

export class PlayerService extends PlayerServiceBase {
    // A restart (deploy, crash) brings the queue back paused where it was, rather than guessing how far it got.
    // Tracks saved before sources existed (plain file links) can't be played anymore and are dropped
    async load() {
        try {
            const saved = await rootServer.dataStore.appData.get<PlayerState>(constants.stateKey);
            if (!saved) return;

            const playing = saved.queue[saved.current];
            const queue = saved.queue.filter((track) => sources.includes(track.source)).map((track) => ({ ...emptyTrack, ...track }));
            Object.assign(state, saved, { queue, current: playing ? queue.findIndex((track) => track.id === playing.id) : -1 });
            setPlayback(false, state.current === -1 ? 0 : saved.position);
        } catch (error) {
            console.error("Loading player state failed:", error);
        }
    }

    // Members with the app open; only the server sees everyone attach and leave, so it keeps the count
    watchListeners() {
        const update = () => {
            state.listeners = rootServer.clients.getClients().length;
            // Someone who leaves while a track buffers may have been the last one everyone was waiting for
            if (state.buffering && buffer.ready.size && this.everyoneReady()) return this.startBuffered(buffer.trackId);
            this.broadcastStateChanged({ state }, "all");
        };

        rootServer.clients.on(ClientEvent.UserAttached, update);
        rootServer.clients.on(ClientEvent.UserDetached, update);
    }

    // Saves and tells every other device; the caller gets the same state back in its response
    private commit(client?: Client): StateResponse {
        rootServer.dataStore.appData.set({ key: constants.stateKey, value: state }).catch((error) => console.error("Saving player state failed:", error));
        this.broadcastStateChanged({ state }, "all", client);
        this.watchBuffering();
        this.prefetch();
        return { state };
    }

    // Arms the safety timer once per buffering track: a listener whose download stalls mustn't hold everyone at 0:00
    private watchBuffering() {
        const trackId = state.buffering ? (state.queue[state.current]?.id ?? "") : "";
        if (trackId === buffer.trackId) return;

        clearTimeout(buffer.timer);
        buffer.trackId = trackId;
        buffer.ready.clear();
        if (trackId) buffer.timer = setTimeout(() => this.startBuffered(trackId), constants.bufferTimeoutMs);
    }

    private startBuffered(trackId: string) {
        if (!state.buffering || state.queue[state.current]?.id !== trackId) return;
        setPlayback(true, 0);
        this.commit();
    }

    // Keeps the playing and the next track downloaded, so changing tracks doesn't wait for YouTube or SoundCloud.
    // A current track that can't be downloaded is skipped, otherwise everyone would sit in silence
    private prefetch() {
        const current = state.queue[state.current];
        const next = state.queue[nextIndex()];
        retainAudio([current?.id, next?.id].filter((id): id is string => !!id));

        if (next && next !== current) prepareAudio(next).then((audio) => this.applyDetails(next, audio), () => {});
        if (!current) return;

        prepareAudio(current).then(
            (audio) => {
                failedInARow = 0;
                this.applyDetails(current, audio);
            },
            () => {
                if (state.queue[state.current]?.id !== current.id) return;
                failedInARow++;
                if (failedInARow >= state.queue.length) setPlayback(false, 0);
                else goToNext(state.playing);
                this.commit();
            },
        );
    }

    // Fills only what the queue didn't know yet, e.g. the cover of a Spotify track found on YouTube Music
    private applyDetails(track: Track, audio: Audio) {
        const missing = Object.entries(audio.details ?? {}).filter(([key, value]) => value && !track[key as keyof Track]);
        if (!missing.length || !state.queue.includes(track)) return;

        Object.assign(track, Object.fromEntries(missing));
        this.commit();
    }

    // Adding to an idle player starts the first new track like a jukebox; it buffers until listeners have it
    private async enqueue(tracks: Track[], client: Client): Promise<StateResponse> {
        const room = constants.maxQueueLength - state.queue.length;
        if (room <= 0) throw fail(PlayerError.QUEUE_FULL, "The queue is full");

        const added = tracks.slice(0, room);
        state.queue.push(...added);

        if (state.current === -1) goTo(state.queue.indexOf(added[0]), true);
        return this.commit(client);
    }

    async getState(): Promise<GetStateResponse> {
        state.listeners = rootServer.clients.getClients().length;
        return { state, serverTime: Date.now() };
    }

    async search(request: SearchRequest): Promise<SearchResponse> {
        const query = request.query.trim().slice(0, constants.maxQueryLength);
        if (!query) return { results: [] };

        try {
            return { results: await search(query, request.source) };
        } catch (error) {
            throw fail(PlayerError.SOURCE_FAILED, "Search failed, try again in a moment", error);
        }
    }

    // Only reads what the link points to; the client shows it and adds the tracks with AddTracks
    async resolveLink(request: ResolveLinkRequest): Promise<ResolveLinkResponse> {
        let url: URL;
        try {
            url = new URL(request.url.trim());
        } catch {
            throw fail(PlayerError.UNSUPPORTED_LINK, "That isn't a link");
        }

        const lookup = importLink(url);
        if (!lookup) throw fail(PlayerError.UNSUPPORTED_LINK, "Only YouTube, SoundCloud and Spotify links are supported");

        let contents: LinkContents;
        try {
            contents = await lookup;
        } catch (error) {
            throw fail(PlayerError.SOURCE_FAILED, "Couldn't read that link", error);
        }
        if (!contents.tracks.length) throw fail(PlayerError.SOURCE_FAILED, "Nothing playable was found at that link");

        return { title: contents.title.slice(0, constants.maxTitleLength), tracks: contents.tracks.slice(0, constants.maxImportTracks) };
    }

    async addTracks(request: AddTracksRequest, client: Client): Promise<StateResponse> {
        const tracks = request.tracks
            .slice(0, constants.maxImportTracks)
            .filter((track) => sources.includes(track.source) && track.sourceId)
            .map((track) => fromClient(track, client.userId));
        if (!tracks.length) throw fail(PlayerError.TRACK_NOT_FOUND, "Nothing to add");
        return this.enqueue(tracks, client);
    }

    async getAudio(request: GetAudioRequest): Promise<GetAudioResponse> {
        const track = state.queue[findTrack(request.trackId)];
        try {
            return await getAudioChunk(track, request.chunk);
        } catch (error) {
            throw fail(PlayerError.SOURCE_FAILED, "This track couldn't be downloaded", error);
        }
    }

    async remove(request: RemoveRequest, client: Client): Promise<StateResponse> {
        const index = findTrack(request.trackId);
        state.queue.splice(index, 1);

        // Removing the playing track moves on to whatever slid into its place
        if (index < state.current) state.current--;
        else if (index === state.current) goTo(index, state.playing);
        return this.commit(client);
    }

    // The playing track keeps playing wherever it lands; current follows it to its new index
    async move(request: MoveRequest, client: Client): Promise<StateResponse> {
        const from = findTrack(request.trackId);
        const to = Math.min(Math.max(request.toIndex, 0), state.queue.length - 1);
        const playing = state.queue[state.current];

        const [track] = state.queue.splice(from, 1);
        state.queue.splice(to, 0, track);
        if (playing) state.current = state.queue.indexOf(playing);
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
        if (state.current !== -1) goToNext(state.playing);
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

    async setRepeat(request: SetRepeatRequest, client: Client): Promise<StateResponse> {
        state.repeat = request.repeat in RepeatMode ? request.repeat : RepeatMode.OFF;
        return this.commit(client);
    }

    // The clock starts once every member with the app open has the audio, or when the timer in watchBuffering runs out
    async trackReady(request: TrackReadyRequest, client: Client): Promise<StateResponse> {
        if (!state.buffering || state.queue[state.current]?.id !== request.trackId) return { state };

        buffer.ready.add(client.userId);
        if (!this.everyoneReady()) return { state };

        setPlayback(true, 0);
        return this.commit();
    }

    private everyoneReady() {
        return rootServer.clients.getClients().every((attached) => buffer.ready.has(attached.userId));
    }

    // Every listening device reports the end, so only the first report for the playing track counts
    async trackEnded(request: TrackEndedRequest, client: Client): Promise<StateResponse> {
        if (!state.playing || state.buffering || state.queue[state.current]?.id !== request.trackId) return { state };

        if (state.repeat === RepeatMode.ONE) setPlayback(true, 0);
        else goToNext(true);
        return this.commit(client);
    }
}

export const playerService = new PlayerService();
