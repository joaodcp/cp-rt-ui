export const dynamic = "force-static";
export const revalidate = 300;

export async function GET(request: Request) {
    const res = await fetch(`${process.env.WORKER_BASE_URL}/stations`, {
        headers: {
            Authorization: `Bearer ${process.env.WORKER_KEY}`,
        },
    });
    const json = await res.json();
    return Response.json(json);
}
