import { NextResponse, NextRequest } from 'next/server';

/**
 * Handle Plivo Answer URL webhook (both GET and POST).
 * Plivo calls this when someone dials the Plivo phone number.
 */
async function handleAnswer(request: NextRequest) {
  const voiceServerWss = process.env.VOICE_SERVER_WSS_URL;

  if (!voiceServerWss) {
    console.error('[plivo/answer] VOICE_SERVER_WSS_URL env var is not set');
    return new NextResponse('Server configuration error', { status: 500 });
  }

  let fromNumber = '';
  let callUUID = '';
  let toNumber = '';

  // 1. Try URL search params (e.g. ?From=+91...)
  const searchParams = request.nextUrl.searchParams;
  fromNumber = searchParams.get('From') || searchParams.get('from') || '';
  callUUID = searchParams.get('CallUUID') || searchParams.get('callUUID') || '';
  toNumber = searchParams.get('To') || searchParams.get('to') || '';

  // 2. Try FormData or JSON if it's a POST request
  if (request.method === 'POST') {
    try {
      const formData = await request.formData();
      if (!fromNumber) fromNumber = (formData.get('From') || formData.get('from') || '') as string;
      if (!callUUID) callUUID = (formData.get('CallUUID') || formData.get('callUUID') || '') as string;
      if (!toNumber) toNumber = (formData.get('To') || formData.get('to') || '') as string;
    } catch (_) {
      try {
        const json = await request.json();
        if (!fromNumber) fromNumber = json.From || json.from || '';
        if (!callUUID) callUUID = json.CallUUID || json.callUUID || '';
        if (!toNumber) toNumber = json.To || json.to || '';
      } catch (__) {
        // Ignore fallback
      }
    }
  }

  console.log(`[plivo/answer] Incoming call from: "${fromNumber}", CallUUID: "${callUUID}", To: "${toNumber}"`);

  // Build the WebSocket URL with query parameters so voice-server knows the caller
  let wsUrl = voiceServerWss.trim();
  try {
    const urlObj = new URL(wsUrl);
    if (fromNumber) {
      urlObj.searchParams.set('from', fromNumber.trim());
    }
    if (callUUID) {
      urlObj.searchParams.set('callUUID', callUUID.trim());
    }
    if (toNumber) {
      urlObj.searchParams.set('to', toNumber.trim());
    }
    wsUrl = urlObj.toString();
  } catch (err) {
    console.error('[plivo/answer] Failed to parse URL:', err);
    if (fromNumber) {
      wsUrl += (wsUrl.includes('?') ? '&' : '?') + `from=${encodeURIComponent(fromNumber.trim())}`;
    }
  }

  // Ensure ampersands in stream URL are XML-safe
  const escapedStreamUrl = wsUrl.replace(/&/g, '&amp;');
  const extraHeadersAttr = fromNumber ? ` extraHeaders="from:${fromNumber.trim()}"` : '';

  const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Stream
    bidirectional="true"
    keepCallAlive="true"
    contentType="audio/x-mulaw;rate=8000"${extraHeadersAttr}>
    ${escapedStreamUrl}
  </Stream>
</Response>`;

  return new NextResponse(xmlResponse.trim(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}

export async function GET(request: NextRequest) {
  return handleAnswer(request);
}

export async function POST(request: NextRequest) {
  return handleAnswer(request);
}
