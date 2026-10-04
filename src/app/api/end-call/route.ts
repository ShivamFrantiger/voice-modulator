import { NextResponse } from "next/server";

const VOICE_SERVER_URL = process.env.VOICE_SERVER_URL;

/** POST /api/end-call — hang up both caller and client phone legs */
export async function POST() {
  if (!VOICE_SERVER_URL) {
    return NextResponse.json({ error: "VOICE_SERVER_URL env var is not set" }, { status: 500 });
  }
  try {
    const res = await fetch(`${VOICE_SERVER_URL}/api/end-call`, { method: "POST" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[end-call] Proxy error:", err);
    return NextResponse.json({ error: "Failed to reach voice server" }, { status: 502 });
  }
}
