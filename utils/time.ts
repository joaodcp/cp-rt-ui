export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    let str = "";
    if (h > 0) str += `${h}h`;
    if (m > 0) str += `${m}m`;
    if (s > 0 || str === "") str += `${s}s`;

    return str;
}
