export const revalidate = 0;

export async function GET(
    request: Request,
    { params }: { params: { stationId: string } },
) {
    const res = await fetch(
        `${process.env.WORKER_BASE_URL}/stations/${params.stationId}/arrivals`,
        {
            headers: {
                Authorization: `Bearer ${process.env.WORKER_KEY}`,
            },
        },
    );
    const json = await res.json();
    return Response.json({ arrivals: json.stationStops });
}
