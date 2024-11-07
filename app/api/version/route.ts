import pkgInfo from "../../../package.json";

export async function GET(request: Request) {
    return Response.json({
        version: pkgInfo.version,
    });
}
