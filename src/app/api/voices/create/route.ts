import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const apiKey = process.env.SARVAM_API_KEY || 'sk_e4hd0wfd_1f3bqBxLzLJ8p8Y45PFQgJib';

    const response = await fetch('https://api.sarvam.ai/voices/create', {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey
      },
      body: formData
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
