import { cacheLife } from "next/cache";
import { connection } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ tripNumber: string }> },
) {
    await connection();
    
    const { tripNumber } = await params;

    const json = await fetchTrip(tripNumber);
    return Response.json({ occupancy: json.occupancy });
}

async function fetchTrip(tripNumber: string) {
    'use cache';
    cacheLife({
        stale: 10,
        revalidate: 10,
        expire: 60,
    })
    const res = await fetch(
        `${process.env.WORKER_BASE_URL}/trips/${tripNumber}`,
        {
            headers: {
                Authorization: `Bearer ${process.env.WORKER_KEY}`,
            },
        },
    );
    const json = await res.json();
    return json;
}