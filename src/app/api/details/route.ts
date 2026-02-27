import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });
        const html = await response.text();
        const $ = cheerio.load(html);

        const title = $('.b-post__title h1').text() || $('.b-content__main .b-post__title h1').text();
        const origTitle = $('.b-post__origtitle').text() || undefined;
        const poster = $('.b-sidecover img').attr('src');
        const description = $('.b-post__description_text').text().trim();

        const info: Record<string, string> = {};
        $('.b-post__info tr').each((i, el) => {
            const key = $(el).find('td h2').text() || $(el).find('td:first-child').text();
            const val = $(el).find('td:last-child').text().trim();
            if (key) {
                info[key.replace(':', '').trim()] = val;
            }
        });

        // Extract translation options
        const translations: Array<{ id: string, name: string, movieId?: string, flag?: string }> = [];
        $('.b-translator__item').each((i, el) => {
            const titleAttr = $(el).attr('title')?.trim();
            const text = $(el).text().trim();
            const flag = $(el).find('img').attr('src');

            translations.push({
                id: $(el).attr('data-translator_id') || '',
                name: titleAttr || text,
                flag: flag || undefined,
                movieId: $(el).attr('data-id') || ''
            });
        });

        // Extract Seasons
        const seasons: Array<{ id: string, name: string }> = [];
        $('.b-simple_season__item').each((i, el) => {
            const tabId = $(el).attr('data-tab_id');
            const name = $(el).text().trim();
            if (tabId) {
                seasons.push({ id: tabId, name });
            }
        });

        // Extract Episodes Map per Season
        const episodes: Record<string, Array<{ id: string, name: string }>> = {};
        $('.b-simple_episode__item').each((i, el) => {
            const seasonId = $(el).attr('data-season_id');
            const episodeId = $(el).attr('data-episode_id');
            const episodeName = $(el).text().trim();
            if (seasonId && episodeId) {
                if (!episodes[seasonId]) {
                    episodes[seasonId] = [];
                }
                episodes[seasonId].push({ id: episodeId, name: episodeName });
            }
        });

        // Let's find script containing video events for single-voiceover movies which might not have #translators-list
        let movieId = '';
        let defaultTranslator = '';
        const cdnScript = $('script').filter((i, el) => {
            const content = $(el).html() || '';
            return content.includes('initCDNSeriesEvents') || content.includes('initCDNMoviesEvents');
        }).html() || '';

        const match = cdnScript.match(/initCDN(?:Series|Movies)Events\s*\(\s*(\d+)(?:\s*,\s*(\d+))?/);
        if (match && match[1]) {
            movieId = match[1];
            if (match[2]) {
                defaultTranslator = match[2];
            }
        }

        // If there are no translations in the list but we found default IDs in the script, add a default one
        if (translations.length === 0 && movieId) {
            translations.push({
                id: defaultTranslator,
                name: 'Default',
                movieId: movieId
            });
        }

        // Ensure we always have a base movieId if possible
        if (!movieId && translations.length > 0 && translations[0].movieId) {
            movieId = translations[0].movieId;
        }

        const isSeries = seasons.length > 0 || !!$('.b-translator__block').length || html.includes('data-season_id');

        const details = {
            title,
            origTitle,
            poster,
            description,
            info,
            isSeries,
            translations,
            seasons,
            episodes,
            movieId
        };

        return NextResponse.json(details);

    } catch (error) {
        console.error('Details API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 });
    }
}
