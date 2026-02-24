import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const url = `https://hdrezka.name/search/?do=search&subaction=search&q=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            }
        });
        const html = await response.text();
        const $ = cheerio.load(html);

        const results: any[] = [];
        $('.b-content__inline_item').each((i, el) => {
            const resultUrl = $(el).find('.b-content__inline_item-link a').attr('href');
            const title = $(el).find('.b-content__inline_item-link a').text();
            const poster = $(el).find('.b-content__inline_item-cover img').attr('src');
            const info = $(el).find('.b-content__inline_item-link div').text();

            if (title && resultUrl) {
                results.push({
                    title,
                    url: resultUrl,
                    poster,
                    info
                });
            }
        });

        return NextResponse.json({ results });

    } catch (error) {
        console.error('Search API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch search results' }, { status: 500 });
    }
}
