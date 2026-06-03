import i18n from "@/i18n/i18n";

export function formatDuration(seconds: number, verbose = false, isArrival = false): string {
    const t = i18n.t.bind(i18n);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (!verbose) {
        let str = "";
        if (h > 0) str += `${h}${isArrival ? "\u00A0" : ""}h`;
        if (m > 0) str += isArrival ? `${m}\u00A0min` : `${m}m`;
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

export function parseHHMM(
    timeStr: string,
    operationalDate: Date = new Date(),
): Date | null {
    const [hours, minutes] = timeStr.split(":").map(Number);

    if (
        isNaN(hours) ||
        isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
    ) {
        return null;
    }

    const date = new Date(operationalDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
}

export function getTimezoneOffsetMinutes(date: Date, timeZone: string): number {
    const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    const parts = dtf.formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) {
        if (p.type !== "literal") map[p.type] = p.value;
    }

    const asUTC = Date.UTC(
        Number(map.year),
        Number(map.month) - 1,
        Number(map.day),
        Number(map.hour),
        Number(map.minute),
        Number(map.second),
    );

    return (asUTC - date.getTime()) / 60000;
}

export function parseHHMMInTimeZone(
    timeStr: string,
    timeZone: string,
    operationalDate: Date = new Date(),
): Date | null {
    const [hours, minutes] = timeStr.split(":").map(Number);

    if (
        isNaN(hours) ||
        isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
    ) {
        return null;
    }

    const year = operationalDate.getFullYear();
    const month = operationalDate.getMonth();
    const day = operationalDate.getDate();

    const utcForLocal = Date.UTC(year, month, day, hours, minutes, 0);

    const offsetMinutes = getTimezoneOffsetMinutes(new Date(utcForLocal), timeZone);

    const timestamp = utcForLocal - offsetMinutes * 60000;

    return new Date(timestamp);
}
