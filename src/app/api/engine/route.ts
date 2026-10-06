import { NextResponse, NextRequest } from "next/server";

const VOICE_SERVER_URL = process.env.VOICE_SERVER_URL;

/** GET /api/engine — fetch active engine & server config */
export async function GET() {
  if (!VOICE_SERVER_URL) {
    return NextResponse.json({ error: "VOICE_SERVER_URL env var is not set" }, { status: 500 });
  }
  try {
    const res = await fetch(`${VOICE_SERVER_URL}/api/engine`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[engine] Proxy error:", err);
    return NextResponse.json({ error: "Failed to reach voice server" }, { status: 502 });
  }
}

/** POST /api/engine — switch active modulation engine on command */
export async function POST(request: NextRequest) {
  if (!VOICE_SERVER_URL) {
    return NextResponse.json({ error: "VOICE_SERVER_URL env var is not set" }, { status: 500 });
  }
  let body: { engine?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const res = await fetch(`${VOICE_SERVER_URL}/api/engine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[engine] Proxy error:", err);
    return NextResponse.json({ error: "Failed to reach voice server" }, { status: 502 });
  }
}
