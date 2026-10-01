import { NextResponse, NextRequest } from 'next/server';

/**
 * POST /api/plivo/agent-answer
 *
 * Called by Plivo when your phone (the agent/second leg) answers.
 * This returns a <Stream> XML so that voice-server can also receive
 * YOUR audio (outbound track) and process it through Sarvam STT→TTS
 * before sending it back to the customer as a female voice.
 *
 * Your phone will behave completely normally — you hear the customer
 * and speak naturally. The stream just taps into your microphone audio.
 */
export async function POST(request: NextRequest) {
  let voiceServerWss = process.env.VOICE_SERVER_WSS_URL;

  if (!voiceServerWss) {
    console.error('[plivo/agent-answer] VOICE_SERVER_WSS_URL env var is not set');
    return new NextResponse('Server configuration error', { status: 500 });
  }
  
  // Extract sessionId from query params
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (sessionId) {
    voiceServerWss += `?sessionId=${sessionId}`;
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
