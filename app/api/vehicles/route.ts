import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    await connection();

    const unresolvedExcludes = request.nextUrl.searchParams.get("excludes") || undefined;
    const excludes = unresolvedExcludes?.split(',') ?? [];
    const unresolvedIncludes = request.nextUrl.searchParams.get("includes") || undefined;
    const includes = unresolvedIncludes?.split(',') ?? [];

    const json = await fetchVehicles(includes.includes('extraAgencies'), excludes.includes('defaultAgencies'));
    return Response.json(json);
}

async function fetchVehicles(includeExtraAgencies: boolean, excludeDefaultAgencies: boolean) {
    'use cache';
    cacheLife({
        stale: 3,
        revalidate: 3,
        expire: 60,
    })

    const res = await fetch(
        `${process.env.WORKER_BASE_URL}?excludes=completed${excludeDefaultAgencies ? ',defaultAgencies' : ''}${includeExtraAgencies ? '&includes=extraAgencies' : ''}`,
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