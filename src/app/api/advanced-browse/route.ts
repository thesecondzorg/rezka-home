import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const includeGenresStr = searchParams.get('includeGenres') || '';
    const excludeGenresStr = searchParams.get('excludeGenres') || '';
    const typesStr = searchParams.get('types') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 50;
    const offset = (page - 1) * limit;

    const includeGenres = includeGenresStr ? includeGenresStr.split(',') : [];
    const excludeGenres = excludeGenresStr ? excludeGenresStr.split(',') : [];
    const types = typesStr ? typesStr.split(',') : [];

    let query = `
        SELECT c.*
        FROM catalog c
        WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by type
    if (types.length > 0) {
        query += ` AND c.type IN (${types.map(() => '?').join(',')})`;
        params.push(...types);
    }

    // Filter by INCLUSIONS (AND matching - strict match)
    if (includeGenres.length > 0) {
        for (const genre of includeGenres) {
            query += ` AND c.genres LIKE ?`;
            params.push(`%${genre}%`);
        }
    }

    // Filter by EXCLUSIONS
    if (excludeGenres.length > 0) {
        for (const genre of excludeGenres) {
            query += ` AND c.genres NOT LIKE ?`;
            params.push(`%${genre}%`);
        }
    }

    // Sort by year, newest first
    query += ` ORDER BY c.year DESC, c.title ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    try {
        const results = db.prepare(query).all(...params);

        // Parse JSON fields
        const parsedResults = results.map((row: any) => ({
            ...row,
            translations: row.translations ? JSON.parse(row.translations) : [],
            seasons: row.seasons ? JSON.parse(row.seasons) : [],
            episodes: row.episodes ? JSON.parse(row.episodes) : {},
            // create pseudo-info to match existing structure
            info: row.genres || row.type || ''
        }));

        return NextResponse.json({ results: parsedResults, page, hasMore: results.length === limit });
    } catch (error) {
        console.error('Advanced Browse Error:', error);
        return NextResponse.json({ error: 'Failed to search local catalog' }, { status: 500 });
    }
}
