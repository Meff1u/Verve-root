import { useEffect, useRef, useState } from "react";
import { playerServiceClient } from "@verve/gen-client";
import { Source, Track } from "@verve/gen-shared";
import constants from "../constants";
import { describeError } from "./usePlayer";

// Searches as the user types, waiting for a short pause so each keystroke doesn't become a request;
// answers to older queries that arrive late are ignored, so results always match what's in the box
export const useSearch = (query: string, source: Source) => {
    const [results, setResults] = useState<Track[]>([]);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const latest = useRef(0);

    useEffect(() => {
        const text = query.trim();
        const request = ++latest.current;

        if (!text) {
            setResults([]);
            setSearching(false);
            setError(null);
            return;
        }

        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const response = await playerServiceClient.search({ query: text, source });
                if (request !== latest.current) return;
                setResults(response.results);
                setError(null);
            } catch (failure) {
                if (request !== latest.current) return;
                setResults([]);
                setError(describeError(failure));
            } finally {
                if (request === latest.current) setSearching(false);
            }
        }, constants.searchDelay);

        return () => clearTimeout(timer);
    }, [query, source]);

    return { results, searching, error };
};
