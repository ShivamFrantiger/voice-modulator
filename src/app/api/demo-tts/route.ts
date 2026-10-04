import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text, voice_id } = await request.json();
    
    // We must use the voices/clone endpoint to use a cloned voice_id
    const fd = new FormData();
    fd.append('text', text || 'Hello, this is a test of the cloned voice.');
    fd.append('language_code', 'hi-IN');
    fd.append('voice_id', voice_id || 'svc-6a67438d-5e48-44f2-8866-1b0b037a5de5');

    const apiKey = process.env.SARVAM_API_KEY || 'sk_e4hd0wfd_1f3bqBxLzLJ8p8Y45PFQgJib';

    const response = await fetch('https://api.sarvam.ai/voices/clone', {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey
      },
      body: fd
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
