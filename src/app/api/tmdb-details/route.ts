import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function GET(request: Request) {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'TMDB_API_KEY is not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = (searchParams.get('type') || 'movie') as 'movie' | 'tv';

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || '';

    try {
        // Fetch details AND external IDs one call if possible, or two.
        // Actually /movie/{id}?append_to_response=external_ids is best.
        const url = `${TMDB_BASE}/${type}/${id}?api_key=${apiKey}&append_to_response=external_ids`;
        
        const res = await fetch(url, {
            headers: { 'User-Agent': userAgent },
            next: { revalidate: 3600 }, // metadata cache
        });

        if (!res.ok) {
            return NextResponse.json({ error: 'TMDB details fetch failed' }, { status: res.status });
        }

        const data = await res.json();
        
        return NextResponse.json({
            id: data.id,
            imdbId: data.external_ids?.imdb_id || null,
            title: data.title || data.name || '',
            originalTitle: data.original_title || data.original_name || '',
            year: (data.release_date || data.first_air_date || '').slice(0, 4),
            overview: data.overview || '',
            posterPath: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
            backdropPath: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null,
            genres: data.genres?.map((g: any) => g.name) || [],
            rating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : null,
            voteCount: data.vote_count || 0
        });

    } catch (err) {
        console.error('TMDB Details Error:', err);
        return NextResponse.json({ error: 'Failed to fetch TMDB details' }, { status: 500 });
    }
}
