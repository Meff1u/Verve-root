import { Client, rootServer } from "@rootsdk/server-app";
import { LibraryServiceBase } from "@verve/gen-server";
import { FavoritesResponse, ToggleFavoriteRequest, Track } from "@verve/gen-shared";
import constants from "./constants";

// One key per member keeps each list small and lets members save at the same time without overwriting each other
const keyFor = (userId: string) => `${constants.favoritesKey}:${userId}`;

// Favorites are matched by URL rather than queue id, so the same song added twice counts as one favorite
export class LibraryService extends LibraryServiceBase {
    async listFavorites(_request: unknown, client: Client): Promise<FavoritesResponse> {
        const favorites = await rootServer.dataStore.appData.get<Track[]>(keyFor(client.userId));
        return { favorites: favorites ?? [] };
    }

    async toggleFavorite(request: ToggleFavoriteRequest, client: Client): Promise<FavoritesResponse> {
        const track = request.track;
        if (!track?.url) return this.listFavorites(request, client);

        const favorites = await rootServer.dataStore.appData.update<Track[]>(
            keyFor(client.userId),
            (list) => (list.some((saved) => saved.url === track.url) ? list.filter((saved) => saved.url !== track.url) : [track, ...list].slice(0, constants.maxFavorites)),
            [],
        );
        return { favorites };
    }
}

export const libraryService = new LibraryService();
