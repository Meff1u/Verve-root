import { useEffect, useState } from "react";
import constants from "../constants";

// Matches the CSS breakpoint where the sidebar turns into a bottom tab bar, so markup and styles switch together
const query = `(max-width: ${constants.mobileBreakpoint}px)`;

export const useIsMobile = () => {
    const [mobile, setMobile] = useState(() => matchMedia(query).matches);

    useEffect(() => {
        const media = matchMedia(query);
        const update = () => setMobile(media.matches);
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, []);

    return mobile;
};
