export const dynamic = "force-static";
export const revalidate = 10;

export async function GET(request: Request) {
    const res = await fetch(
        "https://cp-rt.up.railway.app/last-vehicles-snapshot",
        {
            headers: {
                Authorization: "Bearer " + process.env.CP_RT_API_KEY,
            },
        }
    );
    const json = await res.json();
    return Response.json(json);
}
