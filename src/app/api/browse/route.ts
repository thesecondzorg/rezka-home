import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
        return NextResponse.json({ error: 'Query parameter "path" is required' }, { status: 400 });
    }

    // Must start with a slash
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `https://hdrezka.name${normalizedPath}`;
    console.log('[HDRezka API] Calling Browse API:', url);

    const reqUserAgent = request.headers.get('user-agent');
    const reqCookie = request.headers.get('cookie');
    const cookieHeader = process.env.HDREZKA_COOKIE || reqCookie || '';

    try {
        const headers: Record<string, string> = {
            ...(reqUserAgent ? { 'User-Agent': reqUserAgent } : {}),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        };

        if (cookieHeader) {
            headers['Cookie'] = cookieHeader;
        }

        const response = await fetch(url, { headers });
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

        // Also fetch pagination details eventually if needed, but for now just the results
        const titleText = $('.b-content__main .b-content__htitle').text().trim() || 'Catalog';
        
        return NextResponse.json({ results, title: titleText });

    } catch (error) {
        console.error('Browse API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch catalog results' }, { status: 500 });
    }
}
