import * as cheerio from 'cheerio';

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

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} at ${url}`);
        }
        return response;
    } catch (err) {
        if (retries > 0) {
            console.log(`[Scraper] Retrying ${url} (${retries} left)`);
            await new Promise(r => setTimeout(r, 2000));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw err;
    }
}

export async function fetchPageDetails(url: string, userAgent?: string): Promise<Partial<CatalogItem>> {
    const fullUrl = url.startsWith('http') ? url : `https://hdrezka.name${url.startsWith('/') ? url : '/' + url}`;
    const headers: Record<string, string> = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'max-age=0',
    };
    if (userAgent) headers['User-Agent'] = userAgent;

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

export async function fetchCatalogPage(path: string, userAgent?: string) {
    const url = `https://hdrezka.name${path.startsWith('/') ? path : '/' + path}`;
    const headers: Record<string, string> = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };
    if (userAgent) headers['User-Agent'] = userAgent;

    const response = await fetchWithRetry(url, { headers });
    const html = await response.text();
    const $ = cheerio.load(html);

    const items: any[] = [];
    $('.b-content__inline_item').each((i, el) => {
        const link = $(el).find('.b-content__inline_item-link a').attr('href');
        if (link) items.push(link);
    });

    const nextLink = $('.b-navigation a:contains("Далее")').attr('href');
    const totalPages = $('.b-navigation a').last().prev().text();

    return { items, nextLink, totalPages: parseInt(totalPages) || 1 };
}
