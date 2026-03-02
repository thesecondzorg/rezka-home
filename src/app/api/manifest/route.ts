import { NextResponse } from 'next/server';

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const b64Data = searchParams.get('data');

    if (!b64Data) {
        return new NextResponse('Missing data', { status: 400 });
    }

    try {
        // Decode base64 payload into plain text M3U8 string
        const manifestString = Buffer.from(b64Data, 'base64').toString('utf-8');

        return new NextResponse(manifestString, {
            headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                // Enable CORS so the player can request this if needed
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (e) {
        return new NextResponse('Invalid manifest payload', { status: 400 });
    }
}
