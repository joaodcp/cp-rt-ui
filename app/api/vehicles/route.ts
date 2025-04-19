export async function GET(request: Request) {
    const res = await fetch(
        "https://cp-rt.up.railway.app/last-vehicles-snapshot",
        {
            next: {
                revalidate: 10,
            },
            headers: {
                Authorization: "Bearer " + process.env.CP_RT_API_KEY,
                Pragma: "no-cache",
                "Cache-Control": "no-cache",
            },
        }
    );
    const json = await res.json();
    return Response.json(json);
}
