import { cacheLife } from "next/cache";
import { connection } from "next/server";


export async function GET(request: Request) {
    await connection();

    const json = await fetchStats();
    return Response.json(json);
}

async function fetchStats() {
    'use cache';
    cacheLife({
        stale: 30,
        revalidate: 30,
        expire: 60,
    })
    
    const res = await fetch(`${process.env.WORKER_BASE_URL}/stats`, {
        headers: {
            Authorization: `Bearer ${process.env.WORKER_KEY}`,
        },
    });
    const json = await res.json();
    return json;
}