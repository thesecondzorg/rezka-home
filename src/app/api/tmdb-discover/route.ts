import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type      = (searchParams.get('type') || 'movie') as 'movie' | 'tv' | 'cartoons' | 'anime';
    const page      = searchParams.get('page') || '1';
    const query     = searchParams.get('query') || '';
    const includeGenres = searchParams.get('includeGenres') || '';
    const excludeGenres = searchParams.get('excludeGenres') || '';
    const language      = searchParams.get('languages') || '';
    const country       = searchParams.get('country') || '';
    const year          = searchParams.get('year') || '';
    let   sortBy        = searchParams.get('sortBy') || 'popularity.desc';

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'TMDB_API_KEY is not configured' }, { status: 500 });
    }

    const userAgent = request.headers.get('user-agent') || '';
    const params = new URLSearchParams({ api_key: apiKey, page, language: 'en-US' });

    // Determine TMDB base type
    let tmdbType: 'movie' | 'tv' = (type === 'movie' || type === 'cartoons' || (type === 'anime' && !searchParams.get('isTv'))) ? 'movie' : 'tv';
    
    // Heuristic: If we are in 'anime' or 'cartoons', we might want to search both, but for now we follow the 'type' param or default to movie
    if (type === 'tv') tmdbType = 'tv';

    // Apply special filters for Cartoons/Anime
    if (type === 'cartoons') {
        const genres = includeGenres ? `${includeGenres},16` : '16';
        params.set('with_genres', genres);
    } else if (type === 'anime') {
        const genres = includeGenres ? `${includeGenres},16` : '16';
        params.set('with_genres', genres);
        params.set('with_original_language', 'ja');
    } else {
        if (includeGenres) params.set('with_genres', includeGenres);
    }

    if (tmdbType === 'tv') {
        sortBy = sortBy.replace('release_date', 'first_air_date');
    }

    let endpoint: string;
    if (query.trim()) {
        endpoint = `${TMDB_BASE}/search/${tmdbType}`;
        params.set('query', query.trim());
    } else {
        endpoint = `${TMDB_BASE}/discover/${tmdbType}`;
        if (excludeGenres) params.set('without_genres', excludeGenres);
        if (language)      params.set('with_original_language', language);
        if (country)       params.set('with_origin_country', country);
        if (year && year !== '0') {
            if (tmdbType === 'movie') params.set('primary_release_year', year);
            else params.set('first_air_date_year', year);
        }
        params.set('sort_by', sortBy);
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
