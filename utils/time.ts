import i18n from "@/i18n/i18n";

export function formatDuration(seconds: number, verbose = false): string {
    const t = i18n.t.bind(i18n);
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
    if (h > 0) parts.push(`${h} ${h === 1 ? t("time.hour") : t("time.hours")}`);
    if (m > 0)
        parts.push(`${m} ${m === 1 ? t("time.minute") : t("time.minutes")}`);
    if (s > 0 || parts.length === 0)
        parts.push(`${s} ${s === 1 ? t("time.second") : t("time.seconds")}`);

    if (parts.length === 1) return parts[0];
    return (
        parts.slice(0, -1).join(", ") +
        " " +
        t("time.and") +
        " " +
        parts.slice(-1)
    );
}
