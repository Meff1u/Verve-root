import { useEffect, useState } from "react";
import { rootClient } from "@rootsdk/client-app";

// Turns user ids into nicknames, asking Root only about ids it hasn't seen yet; ids Root has no profile for
// (e.g. DevBar's virtual users) get an empty name, so they aren't asked about again and fall back to "Someone"
export const useNicknames = (userIds: string[]) => {
    const [names, setNames] = useState<Record<string, string>>({});
    const missing = [...new Set(userIds)].filter((id) => id && !(id in names));
    const key = missing.join(",");

    useEffect(() => {
        if (!missing.length) return;

        const empty = Object.fromEntries(missing.map((id) => [id, ""]));

        rootClient.users.getUserProfiles(missing).then(
            (profiles) => setNames((known) => ({ ...known, ...empty, ...Object.fromEntries(profiles.map((profile) => [profile.id, profile.nickname])) })),
            (error) => {
                setNames((known) => ({ ...known, ...empty }));
                console.error("Loading profiles failed:", error);
            },
        );
    }, [key]);

    return (userId: string) => (userId in names ? names[userId] || "Someone" : "…");
};
