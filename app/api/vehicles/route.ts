export const dynamic = "force-static";
export const revalidate = 10;

export async function GET(request: Request) {
    const res = await fetch("https://cp.jdcp.workers.dev?excludes=completed");
    const json = await res.json();
    return Response.json(json);
}
