import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        tmdbEnabled: !!process.env.TMDB_API_KEY
    });
}
