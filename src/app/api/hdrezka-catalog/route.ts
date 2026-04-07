import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
        return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }

    // Ensure the path is relative and doesn't contain the protocol
    const cleanPath = path.startsWith('http') ? new URL(path).pathname : path;
    const url = `https://hdrezka.name${cleanPath}`;
    console.log('HDRezka Catalog Call:', url);

    const reqUserAgent = request.headers.get('user-agent');

    try {
        const response = await fetch(url, {
            headers: {
                ...(reqUserAgent ? { 'User-Agent': reqUserAgent } : {}),
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
            const category = $(el).find('span.cat').text().trim();

            if (title && resultUrl) {
                results.push({
                    title,
                    url: resultUrl,
                    poster,
                    info,
                    category
                });
            }
        });

        return NextResponse.json({ results });

    } catch (error) {
        console.error('Catalog API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch catalog results' }, { status: 500 });
    }
}
