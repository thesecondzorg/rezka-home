import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        // Search using FTS5 
        // We Use 'BM25' for ranking if available, but simple 'MATCH' is fast
        const results = db.prepare(`
            SELECT c.*
            FROM catalog c
            JOIN catalog_fts f ON c.id = f.id
            WHERE catalog_fts MATCH ?
            ORDER BY rank
            LIMIT 50
        `).all(`${query}*`);

        // Parse JSON fields
        const parsedResults = results.map((row: any) => ({
            ...row,
            translations: row.translations ? JSON.parse(row.translations) : [],
            seasons: row.seasons ? JSON.parse(row.seasons) : [],
            episodes: row.episodes ? JSON.parse(row.episodes) : {}
        }));

        return NextResponse.json({ results: parsedResults });
    } catch (error) {
        console.error('Local Search Error:', error);
        return NextResponse.json({ error: 'Failed to search local catalog' }, { status: 500 });
    }
}
