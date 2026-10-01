import { NextResponse, NextRequest } from 'next/server';

/**
 * POST /api/plivo/answer
 *
 * Called by Plivo when a customer calls the Plivo number.
 * Returns a <Stream> XML that opens a bidirectional WebSocket
 * to the voice-server, replacing the old <Dial> approach.
 *
 * The voice-server receives both legs of the call:
 *   - inbound  = customer audio (routed to your phone as-is)
 *   - outbound = your audio    (converted to female via Sarvam STT+TTS)
 */
export async function POST(request: NextRequest) {
  const voiceServerWss = process.env.VOICE_SERVER_WSS_URL;

  if (!voiceServerWss) {
    console.error('[plivo/answer] VOICE_SERVER_WSS_URL env var is not set');
    return new NextResponse('Server configuration error', { status: 500 });
  }

  const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Stream
    bidirectional="true"
    keepCallAlive="true"
    contentType="audio/x-mulaw;rate=8000">
    ${voiceServerWss}
  </Stream>
</Response>`;

  return new NextResponse(xmlResponse.trim(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}
