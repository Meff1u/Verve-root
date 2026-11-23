import constants from "../constants";

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Root allows a client 10 requests per second in total. Audio chunks and covers share one pace that stays well under
// it, so searching, the import preview and the player controls always have requests left
let nextSlot = 0;
export const takeSlot = async () => {
    const now = Date.now();
    const slot = Math.max(now, nextSlot);
    nextSlot = slot + constants.chunkInterval;
    if (slot > now) await wait(slot - now);
};
