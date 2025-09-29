export function formatDuration(seconds: number, verbose = false): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (!verbose) {
        let str = "";
        if (h > 0) str += `${h}h`;
        if (m > 0) str += `${m}m`;
        if (s > 0 || str === "") str += `${s}s`;
        return str;
    }

    const parts = [];
    if (h > 0) parts.push(`${h} ${h === 1 ? "hora" : "horas"}`);
    if (m > 0) parts.push(`${m} ${m === 1 ? "minuto" : "minutos"}`);
    if (s > 0 || parts.length === 0)
        parts.push(`${s} ${s === 1 ? "segundo" : "segundos"}`);

    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(", ") + " e " + parts.slice(-1);
}
