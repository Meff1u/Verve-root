import { useEffect, useState } from "react";
import { libraryServiceClient } from "@verve/gen-client";
import { Track } from "@verve/gen-shared";

export type Library = ReturnType<typeof useLibrary>;

// The member's own favorites; toggling answers with the whole updated list, so there's nothing to merge
export const useLibrary = () => {
    const [favorites, setFavorites] = useState<Track[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        libraryServiceClient.listFavorites({}).then(
            (response) => {
                setFavorites(response.favorites);
                setLoaded(true);
            },
            (error) => console.error("Loading favorites failed:", error),
        );
    }, []);

    return {
        favorites,
        loaded,
        isFavorite: (track: Track | null) => !!track && favorites.some((saved) => saved.url === track.url),
        toggleFavorite: async (track: Track) => {
            try {
                const response = await libraryServiceClient.toggleFavorite({ track });
                setFavorites(response.favorites);
            } catch (error) {
                console.error("Saving favorite failed:", error);
            }
        },
    };
};
