export const formatTime = (seconds: number) => {
    const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export const isUrl =(value: string) => /^https?:\/\/\S+$/i.test(value.trim());

// Same text always gets the same pair, so a track keeps its placeholder cover between renders and devices
export const pickGradient = (text: string, gradients: string[][]) => {
    let hash = 0;
    for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return gradients[Math.abs(hash) % gradients.length];
};
