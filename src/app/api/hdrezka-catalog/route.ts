import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

/**
 * Build a paginated path from a base catalog path.
 * HDRezka uses the pattern: /films/page/2/ or /films/year/2024/page/2/
 * We inject `page/N/` before any trailing slash at the end.
 */
function buildPagedPath(basePath: string, page: number): string {
    if (page <= 1) return basePath;
    // Strip existing page segment if any
    const stripped = basePath.replace(/page\/\d+\/?$/, '').replace(/\/$/, '');
    return `${stripped}/page/${page}/`;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const page = parseInt(searchParams.get('page') || '1', 10);

    if (!path) {
        return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }

    // Ensure the path is relative and doesn't contain the protocol
    const cleanPath = path.startsWith('http') ? new URL(path).pathname : path;
    const pagedPath = buildPagedPath(cleanPath, page);
    const url = `https://hdrezka.name${pagedPath}`;
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

        // --- Pagination ---
        // HDRezka uses .b-navigation for page links; "Далее" is the "Next" anchor.
        // We also check for any non-numeric anchor text as a fallback next-indicator.
        const $nav = $('.b-navigation');
        const nextHref = $nav.find('a').filter((_, el) => {
            const text = $(el).text().trim();
            return text === 'Далее' || text === '»' || text.toLowerCase() === 'next';
        }).attr('href');

        // Parse total pages from numbered links in the pagination block
        const pageNums = $nav.find('a')
            .map((_, el) => parseInt($(el).text().trim(), 10))
            .get()
            .filter((n: number) => !isNaN(n));
        const totalPages = pageNums.length > 0 ? Math.max(...pageNums) : null;

        let nextPage: number | null = null;
        if (nextHref) {
            // Extract page number from href like https://hdrezka.name/films/page/3/
            const match = nextHref.match(/\/page\/(\d+)\//);
            nextPage = match ? parseInt(match[1], 10) : page + 1;
        } else if (totalPages != null && page < totalPages) {
            // Navigation block present, numbered links found, but no explicit "next" text
            nextPage = page + 1;
        } else if (results.length >= 32) {
            // Navigation block absent (blocked/cached) but we got a full page — assume more exists
            nextPage = page + 1;
        }

        return NextResponse.json({ results, nextPage, totalPages: totalPages ?? page, currentPage: page });

    } catch (error) {
        console.error('Catalog API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch catalog results' }, { status: 500 });
    }
}

