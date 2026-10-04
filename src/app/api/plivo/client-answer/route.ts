import { NextResponse, NextRequest } from "next/server";

/**
 * POST /api/plivo/client-answer
 *
 * Called by Plivo when the client (outbound leg) picks up the call.
 * Returns a <Stream> XML pointing to /client-stream on the voice-server.
 *
 * The voice-server will:
 *   - Receive client audio inbound → pass raw to MY phone (I hear real client voice)
 *   - Receive MY modulated audio from ElevenLabs → play to client (client hears fake voice)
 */
export async function POST(request: NextRequest) {
  let voiceServerWss = process.env.VOICE_SERVER_WSS_URL;

  if (!voiceServerWss) {
    console.error("[plivo/client-answer] VOICE_SERVER_WSS_URL env var is not set");
    return new NextResponse("Server configuration error", { status: 500 });
  }

  // Switch /stream endpoint to /client-stream for this leg
  voiceServerWss = voiceServerWss.replace(/\/stream$/, "/client-stream");

  // Extract sessionId from query params
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (sessionId) {
    voiceServerWss += `?sessionId=${sessionId}`;
  }

  const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Stream
    bidirectional="true"
    keepCallAlive="true"
    streamTimeout="86400"
    contentType="audio/x-mulaw;rate=8000">
    ${voiceServerWss}
  </Stream>
</Response>`;

  return new NextResponse(xmlResponse.trim(), {
    headers: { "Content-Type": "text/xml" },
  });
}
