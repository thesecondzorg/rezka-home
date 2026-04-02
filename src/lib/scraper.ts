import * as cheerio from 'cheerio';

export const DEFAULT_MIRRORS = [
    'https://hello-rezka.tv',
    'https://hdrezka.name',
    'https://rezka.ag'
];

export const BASE_URL = DEFAULT_MIRRORS[0];

// HTTP status codes that indicate permanent failure — no point retrying
// 403 is removed from here because it might be a temporary Cloudflare block 
// that we want to handle by switching mirrors.
const PERMANENT_ERROR_CODES = new Set([404, 410]);

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

export interface CatalogItem {
    id: string;
    url: string;
    title: string;
    orig_title?: string;
    poster?: string;
    type?: string;
    year?: number;
    genres?: string;
    country?: string;
    translations?: string; // JSON
    seasons?: string; // JSON
    episodes?: string; // JSON
}

/**
 * Generates a browser-like header set to bypass basic WAF/Anti-Bot filters.
 */
function getStealthHeaders(url: string, userAgent?: string, baseUrl: string = BASE_URL): Record<string, string> {
    const urlObj = new URL(url);
    const baseObj = new URL(baseUrl);

    return {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Host': urlObj.host,
        'Origin': baseObj.origin,
        'Referer': `${baseObj.origin}/`,
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': userAgent || DEFAULT_USER_AGENT,
        'Priority': 'u=0, i'
    };
}

/**
 * Fetch with exponential backoff + jitter.
 * Permanent HTTP errors (404/410) are thrown immediately without retry.
 * 403/503 are handled as retryable (and mirror-switchable in route.ts).
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
    let lastErr: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 s timeout

        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                // Permanent failures — bail immediately, no retry
                if (PERMANENT_ERROR_CODES.has(response.status)) {
                    throw new Error(`HTTP ${response.status} (permanent) at ${url}`);
                }
                throw new Error(`HTTP ${response.status} at ${url}`);
            }

            return response;
        } catch (err: any) {
            clearTimeout(timeoutId);

            // Surface permanent errors immediately (no retry)
            if (err.message?.includes('(permanent)')) throw err;

            lastErr = err;

            if (attempt < retries) {
                // Determine base delay: 10s for 503 (Rate Limit), 1s for others
                const isRateLimit = err.message?.includes('503') || err.message?.includes('403');
                const baseDelay = isRateLimit ? 10000 : 1000;
                
                // Exponential backoff with jitter: min(base * 2^attempt, 30000) + rand(0..1000ms)
                const backoff = Math.min(baseDelay * Math.pow(2, attempt), 30000);
                const jitter = Math.random() * 1000;
                const delay = backoff + jitter;
                
                console.warn(`[Scraper] ${isRateLimit ? 'BLOCK DETECTED' : 'Retry'} ${attempt + 1}/${retries} for ${url} in ${Math.round(delay)}ms`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    throw lastErr;
}

export async function fetchPageDetails(url: string, userAgent?: string, baseUrl: string = BASE_URL): Promise<Partial<CatalogItem>> {
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
    const headers = getStealthHeaders(fullUrl, userAgent, baseUrl);

    const response = await fetchWithRetry(fullUrl, { headers });
    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('.b-post__title h1').text() || $('.b-content__main .b-post__title h1').text();
    const origTitle = $('.b-post__origtitle').text() || undefined;
    const poster = $('.b-sidecover img').attr('src');

    const info: Record<string, string> = {};
    $('.b-post__info tr').each((i, el) => {
        const key = $(el).find('td h2').text() || $(el).find('td:first-child').text();
        const val = $(el).find('td:last-child').text().trim();
        if (key) info[key.replace(':', '').trim()] = val;
    });

    const yearMatch = info['Дата выхода']?.match(/\d{4}/) || info['Год']?.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : undefined;
    const genres = info['Жанр'];
    const country = info['Страна'];

    // Extract translations
    const translations: any[] = [];
    $('.b-translator__item').each((i, el) => {
        translations.push({
            id: $(el).attr('data-translator_id'),
            name: $(el).attr('title') || $(el).text().trim(),
            movieId: $(el).attr('data-id')
        });
    });

    // Extract Seasons & Episodes
    const seasons: any[] = [];
    $('.b-simple_season__item').each((i, el) => {
        seasons.push({ id: $(el).attr('data-tab_id'), name: $(el).text().trim() });
    });

    const episodes: Record<string, any[]> = {};
    $('.b-simple_episode__item').each((i, el) => {
        const seasonId = $(el).attr('data-season_id');
        if (seasonId) {
            if (!episodes[seasonId]) episodes[seasonId] = [];
            episodes[seasonId].push({
                id: $(el).attr('data-episode_id'),
                name: $(el).text().trim()
            });
        }
    });

    // Detect ID from scripts if possible
    let movieId = '';
    const cdnScript = $('script').filter((i, el) => {
        const content = $(el).html() || '';
        return content.includes('initCDNSeriesEvents') || content.includes('initCDNMoviesEvents');
    }).html() || '';
    const idMatch = cdnScript.match(/initCDN(?:Series|Movies)Events\s*\(\s*(\d+)/);
    if (idMatch) movieId = idMatch[1];

    return {
        id: movieId || url.match(/\/(\d+)-/)?.[1] || url,
        url,
        title,
        orig_title: origTitle,
        poster,
        year,
        genres,
        country,
        translations: JSON.stringify(translations),
        seasons: JSON.stringify(seasons),
        episodes: JSON.stringify(episodes),
        type: seasons.length > 0 ? 'series' : 'movie'
    };
}

export async function fetchCatalogPage(path: string, userAgent?: string, baseUrl: string = BASE_URL) {
    const url = `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
    const headers = getStealthHeaders(url, userAgent, baseUrl);

    const response = await fetchWithRetry(url, { headers });
    const html = await response.text();
    const $ = cheerio.load(html);

    const items: string[] = [];
    $('.b-content__inline_item').each((i, el) => {
        const link = $(el).find('.b-content__inline_item-link a').attr('href');
        if (link) items.push(link);
    });

    const nextLink = $('.b-navigation a:contains("Далее")').attr('href');

    // Parse last page number from pagination
    const pageLinks = $('.b-navigation a').map((i, el) => parseInt($(el).text())).get()
        .filter(n => !isNaN(n));
    const totalPages = pageLinks.length > 0 ? Math.max(...pageLinks) : 1;

    return { items, nextLink, totalPages };
}
