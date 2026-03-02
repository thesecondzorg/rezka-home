import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import * as cheerio from 'cheerio';

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const movieId = searchParams.get('id');
    const translatorId = searchParams.get('translator_id');
    const season = searchParams.get('season');
    const episode = searchParams.get('episode');
    const refererUrl = searchParams.get('referer_url') || 'https://hdrezka.name/';
    const action = searchParams.get('action') || (season && episode ? 'get_stream' : 'get_movie');

    if (!movieId || !translatorId) {
        return NextResponse.json({ error: 'id and translator_id are required' }, { status: 400 });
    }

    try {
        const formData = new URLSearchParams();
        formData.append('id', movieId);
        formData.append('translator_id', translatorId);
        if (season) formData.append('season', season);
        if (episode) formData.append('episode', episode);
        formData.append('favs', randomUUID());
        formData.append('action', action);

        // Retry up to 3 times if the connection drops
        let json: any = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await fetch(`https://hdrezka.name/ajax/get_cdn_series/?t=${Date.now()}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0',
                        'Accept': 'application/json, text/javascript, */*; q=0.01',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Origin': 'https://hdrezka.name',
                        'Referer': refererUrl,
                        'Connection': 'keep-alive',
                    },
                    cache: 'no-store',
                    body: formData
                });
                json = await response.json();
                break; // Success, exit retry loop
            } catch (fetchErr) {
                console.warn(`[Stream] Attempt ${attempt}/3 failed:`, fetchErr instanceof Error ? fetchErr.message : fetchErr);
                if (attempt === 3) throw fetchErr;
                await new Promise(r => setTimeout(r, 500)); // Wait before retry
            }
        }

        if (!json.success) {
            console.error('Stream extraction failed upstream', json);
            return NextResponse.json(
                { error: 'Stream extraction failed upstream' },
                { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
            );
        }

        let streams = [];
        let abrManifest = '';
        let abrUrl = '';

        if (json.url) {
            // 1. Parse all streams
            const parsedStreams = json.url.split(',').map((s: string) => {
                const match = s.match(/\[(.*?)\](.*)/);
                if (match) {
                    const quality = match[1]; // e.g. "1080p", "720p"
                    const urlsString = match[2];

                    let url = '';
                    let hlsUrl = '';

                    const urlParts = urlsString.split(' or ');
                    urlParts.forEach((part: string) => {
                        const trimmed = part.trim();
                        if (trimmed.includes(':hls:manifest.m3u8')) {
                            hlsUrl = trimmed;
                        } else if (trimmed.includes('.mp4')) {
                            url = trimmed;
                        }
                    });

                    if (!url && urlParts.length > 0) {
                        url = urlParts[urlParts.length - 1].trim();
                    }

                    // Extract numeric resolution for sorting (e.g. 1080)
                    const resMatch = quality.match(/(\d+)p/);
                    const resolutionLevel = resMatch ? parseInt(resMatch[1], 10) : 0;

                    return { quality, url, hlsUrl, resolutionLevel };
                }
                return null;
            }).filter(Boolean);

            streams = parsedStreams;

            // 2. Build ABR Manifest
            // Only build if we actually have HLS streams to provide
            const hlsStreams = parsedStreams.filter((s: any) => s.hlsUrl);

            if (hlsStreams.length > 0) {
                // Sort from lowest quality to highest for the manifest
                hlsStreams.sort((a: any, b: any) => a.resolutionLevel - b.resolutionLevel);

                abrManifest = "#EXTM3U\n#EXT-X-VERSION:3\n";

                // Standard bitrates mapped to common resolutions
                const bitrateMap: Record<number, { bandwidth: number, width: number, height: number }> = {
                    360: { bandwidth: 800000, width: 640, height: 360 },
                    480: { bandwidth: 1400000, width: 854, height: 480 },
                    720: { bandwidth: 2800000, width: 1280, height: 720 },
                    1080: { bandwidth: 5000000, width: 1920, height: 1080 },
                    1440: { bandwidth: 8000000, width: 2560, height: 1440 },
                    2160: { bandwidth: 15000000, width: 3840, height: 2160 }
                };

                hlsStreams.forEach((stream: any) => {
                    const res = stream.resolutionLevel;
                    const props = bitrateMap[res] || { bandwidth: res * 3000, width: Math.round(res * 1.77), height: res };

                    abrManifest += `#EXT-X-STREAM-INF:BANDWIDTH=${props.bandwidth},RESOLUTION=${props.width}x${props.height},NAME="${stream.quality}"\n`;
                    abrManifest += `${stream.hlsUrl}\n`;
                });

                // Convert payload into base64 to pass securely to a local proxy route
                const encodedManifest = Buffer.from(abrManifest).toString('base64');
                abrUrl = `/api/manifest?data=${encodedManifest}`;
            }
        }

        // Parse seasons/episodes HTML if present (translator-specific)
        let seasons: Array<{ id: string, name: string }> = [];
        let episodes: Record<string, Array<{ id: string, name: string }>> = {};

        if (json.seasons) {
            const $s = cheerio.load(`<ul>${json.seasons}</ul>`);
            $s('li.b-simple_season__item').each((i: number, el: any) => {
                const tabId = $s(el).attr('data-tab_id');
                const name = $s(el).text().trim();
                if (tabId) seasons.push({ id: tabId, name });
            });
        }

        if (json.episodes) {
            const $e = cheerio.load(`<div>${json.episodes}</div>`);
            $e('li.b-simple_episode__item').each((i: number, el: any) => {
                const seasonId = $e(el).attr('data-season_id');
                const episodeId = $e(el).attr('data-episode_id');
                const name = $e(el).text().trim();
                if (seasonId && episodeId) {
                    if (!episodes[seasonId]) episodes[seasonId] = [];
                    episodes[seasonId].push({ id: episodeId, name });
                }
            });
        }

        return NextResponse.json({
            abrUrl,
            streams,
            seasons,
            episodes,
            subtitle: json.subtitle,
            thumbnails: json.thumbnails
        }, {
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
        });

    } catch (error) {
        console.error('Stream API Error:', error);
        return NextResponse.json(
            { error: 'Failed to extract stream' },
            { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    }
}
