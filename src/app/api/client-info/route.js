import { NextResponse } from "next/server";

export async function GET(request) {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");

    const rawIp =
        forwardedFor?.split(",")[0]?.trim() ||
        realIp?.trim() ||
        "";

    const ipAddress =
        rawIp.replace(/^::ffff:/i, "").replace(/^\[|\]$/g, "") ||
        "Unavailable";

    return NextResponse.json(
        { ipAddress },
        {
            headers: {
                "Cache-Control": "no-store",
            },
        }
    );
}