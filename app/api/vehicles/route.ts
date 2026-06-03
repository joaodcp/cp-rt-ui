import { cacheLife } from "next/cache";
import { connection } from "next/server";

export async function GET(request: Request) {
    await connection();

    const json = await fetchVehicles();
    return Response.json(json);
}

async function fetchVehicles() {
    'use cache';
    cacheLife({
        stale: 7,
        revalidate: 7,
        expire: 60,
    })

    const res = await fetch(
        `${process.env.WORKER_BASE_URL}?excludes=completed`,
        {
            headers: {
                Authorization: `Bearer ${process.env.WORKER_KEY}`,
            },
        }
    );

    if (!res.ok) throw new Error(`upstream error (status: ${res.status}) while fetching vehicles`);

    const json = await res.json();
    return json;
}