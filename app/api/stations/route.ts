import { cacheLife } from "next/cache";
import { connection } from "next/server";

export async function GET(request: Request) {
    await connection();

    const json = await fetchStations();
    return Response.json(json);
}

async function fetchStations() {
    'use cache';
    cacheLife({
        stale: 300,
        revalidate: 300,
        expire: 600,
    })

    const res = await fetch(`${process.env.WORKER_BASE_URL}/stations`, {
        headers: {
            Authorization: `Bearer ${process.env.WORKER_KEY}`,
        },
    });

    if (!res.ok) throw new Error(`upstream error (status: ${res.status}) while fetching stations`);

    const json = await res.json();
    return json;
}