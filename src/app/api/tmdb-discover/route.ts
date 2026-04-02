import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function GET(request: Request) {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'TMDB_API_KEY is not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const type      = (searchParams.get('type') || 'movie') as 'movie' | 'tv';
    const page      = searchParams.get('page') || '1';
    const query     = searchParams.get('query') || '';
    const includeGenres = searchParams.get('includeGenres') || '';
    const excludeGenres = searchParams.get('excludeGenres') || '';
    const language      = searchParams.get('languages') || '';
    const country       = searchParams.get('country') || '';
    let   sortBy        = searchParams.get('sortBy') || 'popularity.desc';

    // TMDB TV uses first_air_date instead of release_date for sorting
    if (type === 'tv') {
        sortBy = sortBy.replace('release_date', 'first_air_date');
    }

    const userAgent = request.headers.get('user-agent') || '';

    const params = new URLSearchParams({ api_key: apiKey, page, language: 'en-US' });

    let endpoint: string;

    if (query.trim()) {
        // Title search — use /search endpoint
        endpoint = `${TMDB_BASE}/search/${type}`;
        params.set('query', query.trim());
    } else {
        // Filter-based discover
        endpoint = `${TMDB_BASE}/discover/${type}`;
        if (includeGenres) params.set('with_genres',    includeGenres);
        if (excludeGenres) params.set('without_genres', excludeGenres);
        if (language)      params.set('with_original_language', language);
        if (country)       params.set('with_origin_country', country);
        params.set('sort_by', sortBy);
        // Require at least one vote to avoid noise when sorting by rating
        if (sortBy.startsWith('vote_average')) {
            params.set('vote_count.gte', '100');
        }
    }

    try {
        const res = await fetch(`${endpoint}?${params.toString()}`, {
            headers: { 'User-Agent': userAgent },
            next: { revalidate: 300 }, // cache for 5 min
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('TMDB error:', err);
            return NextResponse.json({ error: 'TMDB request failed', details: err }, { status: res.status });
        }

        const data = await res.json();

        const results = (data.results || []).map((item: any) => ({
            tmdbId:        item.id,
            title:         item.title        || item.name         || '',
            originalTitle: item.original_title || item.original_name || '',
            poster:        item.poster_path
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : null,
            year:          (item.release_date || item.first_air_date || '').slice(0, 4),
            rating:        item.vote_average != null
                ? Math.round(item.vote_average * 10) / 10
                : null,
            overview:      item.overview || '',
            genreIds:      item.genre_ids || [],
            type,
        }));

        return NextResponse.json({
            results,
            page:       data.page,
            totalPages: data.total_pages,
            hasMore:    data.page < Math.min(data.total_pages, 500),
        });
    } catch (err) {
        console.error('TMDB Discover Error:', err);
        return NextResponse.json({ error: 'Failed to fetch from TMDB' }, { status: 500 });
    }
}
