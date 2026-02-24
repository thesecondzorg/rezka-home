import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const movieId = searchParams.get('id');
    const translatorId = searchParams.get('translator_id');
    const season = searchParams.get('season');
    const episode = searchParams.get('episode');
    const action = searchParams.get('action') || (season && episode ? 'get_stream' : 'get_movie');

    if (!movieId || !translatorId) {
        return NextResponse.json({ error: 'id and translator_id are required' }, { status: 400 });
    }

    try {
        const formData = new URLSearchParams();
        formData.append('id', movieId);
        formData.append('translator_id', translatorId);
        formData.append('action', action);

        if (season) formData.append('season', season);
        if (episode) formData.append('episode', episode);

        const response = await fetch('https://hdrezka.name/ajax/get_cdn_series/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://hdrezka.name/'
            },
            body: formData
        });

        const json = await response.json();

        if (!json.success) {
            console.error('Stream extraction failed upstream', json);
            return NextResponse.json({ error: 'Stream extraction failed upstream' }, { status: 500 });
        }

        let streams = [];
        if (json.url) {
            // "url" looks like: [720p]https://...,[1080p]https://...
            streams = json.url.split(',').map((s: string) => {
                const match = s.match(/\[(.*?)\](.*)/);
                if (match) {
                    const quality = match[1];
                    // sometimes URLs have backup links separated by " or "
                    let url = match[2].split(' or ')[0].trim();
                    return { quality, url };
                }
                return { quality: 'unknown', url: s };
            });
        }

        return NextResponse.json({
            streams,
            subtitle: json.subtitle,
            thumbnails: json.thumbnails
        });

    } catch (error) {
        console.error('Stream API Error:', error);
        return NextResponse.json({ error: 'Failed to extract stream' }, { status: 500 });
    }
}
