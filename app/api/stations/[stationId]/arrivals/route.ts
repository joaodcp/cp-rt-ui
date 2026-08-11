import { FERTAGUS_STATION_IDS } from "@/utils/stations";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { NextRequest } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ stationId: string }> },
) {
    await connection();

    const { stationId } = await params;
    const agencyIdsParam = request.nextUrl.searchParams.get("agencyIds") || undefined;

    const arrivals = await fetchArrivals(stationId, agencyIdsParam);
    return Response.json({ arrivals });
}

async function fetchArrivals(stationId: string, agencyIds?: string) {
    'use cache';
    cacheLife({
        stale: 0,
        revalidate: 0,
        expire: 60,
    })
    const res = await fetch(
        `${process.env.WORKER_BASE_URL}/stations/${stationId}/arrivals${agencyIds ? `?agencyIds=${agencyIds}` : ''}`,
        {
            headers: {
                Authorization: `Bearer ${process.env.WORKER_KEY}`,
            },
        },
    );

    if (!res.ok) throw new Error(`upstream error (status: ${res.status}) while fetching station (${stationId}) arrivals`);

    const json = await res.json();
    return json.stationStops;
}