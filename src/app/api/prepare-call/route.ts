import { NextResponse, NextRequest } from "next/server";

const VOICE_SERVER_URL = process.env.VOICE_SERVER_URL;

/** POST /api/prepare-call — register client number and caller number */
export async function POST(request: NextRequest) {
  if (!VOICE_SERVER_URL) {
    return NextResponse.json({ error: "VOICE_SERVER_URL env var is not set" }, { status: 500 });
  }
  let body: { clientNumber?: string; callerNumber?: string; engine?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { clientNumber, callerNumber, engine } = body;
  if (!clientNumber) {
    return NextResponse.json({ error: "clientNumber is required" }, { status: 400 });
  }
  try {
    const res = await fetch(`${VOICE_SERVER_URL}/api/prepare-call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientNumber, callerNumber, engine }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[prepare-call] Proxy error:", err);
    return NextResponse.json({ error: "Failed to reach voice server" }, { status: 502 });
  }
}

/** GET /api/prepare-call — check pending call status */
export async function GET(request: NextRequest) {
  if (!VOICE_SERVER_URL) {
    return NextResponse.json({ error: "VOICE_SERVER_URL env var is not set" }, { status: 500 });
  }
  const callerNumber = request.nextUrl.searchParams.get("callerNumber");
  const targetUrl = callerNumber 
    ? `${VOICE_SERVER_URL}/api/prepare-call/status?callerNumber=${encodeURIComponent(callerNumber)}`
    : `${VOICE_SERVER_URL}/api/prepare-call/status`;
  try {
    const res = await fetch(targetUrl);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[prepare-call/status] Proxy error:", err);
    return NextResponse.json({ error: "Failed to reach voice server" }, { status: 502 });
  }
}

/** DELETE /api/prepare-call — cancel pending registration */
export async function DELETE() {
  if (!VOICE_SERVER_URL) {
    return NextResponse.json({ error: "VOICE_SERVER_URL env var is not set" }, { status: 500 });
  }
  try {
    const res = await fetch(`${VOICE_SERVER_URL}/api/prepare-call/cancel`, { method: "POST" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[prepare-call/cancel] Proxy error:", err);
    return NextResponse.json({ error: "Failed to reach voice server" }, { status: 502 });
  }
}
