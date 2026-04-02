import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { fetchCatalogPage, fetchPageDetails } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

let isSyncing = false;

export async function GET() {
    const state = db.prepare('SELECT * FROM sync_state WHERE name = ?').get('full_catalog');
    return NextResponse.json(state || { status: 'idle' });
}

export async function POST(request: Request) {
    if (isSyncing) {
        return NextResponse.json({ error: 'Sync already in progress' }, { status: 400 });
    }

    const { action } = await request.json();
    const userAgent = request.headers.get('user-agent') || 'Mozilla/5.0';

    if (action === 'start') {
        const existing = db.prepare('SELECT * FROM sync_state WHERE name = ?').get('full_catalog') as any;
        if (existing?.status === 'running') {
             return NextResponse.json({ error: 'Sync already in progress' }, { status: 400 });
        }
        
        // Update state to running
        db.prepare(`
            INSERT INTO sync_state (name, current_page, status, last_updated) 
            VALUES ('full_catalog', 1, 'running', ?)
            ON CONFLICT(name) DO UPDATE SET status = 'running', last_updated = ?
        `).run(Date.now(), Date.now());

        // Fire and forget the sync process (for local dev this usually works)
        runSync(userAgent).catch(console.error);

        return NextResponse.json({ message: 'Sync started' });
    }

    if (action === 'stop') {
        db.prepare('UPDATE sync_state SET status = ? WHERE name = ?').run('idle', 'full_catalog');
        return NextResponse.json({ message: 'Sync stopping...' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

async function runSync(userAgent: string) {
    if (isSyncing) return;
    isSyncing = true;
    
    try {
        const categories = [
            '/movies/',
            '/series/',
            '/animation/',
            '/anime/',
            '/cartoons/'
        ];

        // Check if we can resume
        const state = db.prepare('SELECT * FROM sync_state WHERE name = ?').get('full_catalog') as any;
        let startCatIndex = 0;
        let startPage = 1;

        if (state && state.current_category) {
            const lastCatIndex = categories.indexOf(state.current_category);
            if (lastCatIndex !== -1) {
                startCatIndex = lastCatIndex;
                startPage = state.current_page || 1;
                console.log(`[Sync] Resuming from ${state.current_category} page ${startPage}`);
            }
        }

        for (let i = startCatIndex; i < categories.length; i++) {
            const cat = categories[i];
            let currentPage = i === startCatIndex ? startPage : 1;
            let hasNext = true;

            while (hasNext) {
                // Check if we should stop
                const currentState = db.prepare('SELECT status FROM sync_state WHERE name = ?').get('full_catalog') as any;
                if (!currentState || currentState.status !== 'running') {
                    console.log(`[Sync] Stopping as requested. Status: ${currentState?.status}`);
                    return;
                }

                console.log(`[Sync] Category ${cat} | Page ${currentPage}`);
                
                try {
                    const { items, nextLink } = await fetchCatalogPage(`${cat}page/${currentPage}/`, userAgent);
                    
                    for (const itemUrl of items) {
                        try {
                            const details = await fetchPageDetails(itemUrl, userAgent);
                            
                            db.prepare(`
                                INSERT INTO catalog (id, url, title, orig_title, poster, type, year, genres, country, translations, seasons, episodes, last_indexed_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                ON CONFLICT(id) DO UPDATE SET
                                    title = excluded.title,
                                    orig_title = excluded.orig_title,
                                    poster = excluded.poster,
                                    year = excluded.year,
                                    genres = excluded.genres,
                                    country = excluded.country,
                                    translations = excluded.translations,
                                    seasons = excluded.seasons,
                                    episodes = excluded.episodes,
                                    last_indexed_at = excluded.last_indexed_at
                            `).run(
                                details.id, details.url, details.title, details.orig_title, 
                                details.poster, details.type, details.year, details.genres, details.country,
                                details.translations, details.seasons, details.episodes, Date.now()
                            );

                            db.prepare('UPDATE sync_state SET items_indexed = items_indexed + 1, last_updated = ? WHERE name = ?')
                              .run(Date.now(), 'full_catalog');
                        } catch (e: any) {
                            console.error(`[Sync] Item Failed: ${itemUrl}`, e.message);
                            db.prepare('UPDATE sync_state SET error_count = error_count + 1, last_error = ? WHERE name = ?')
                              .run(`Item ${itemUrl}: ${e.message}`, 'full_catalog');
                        }
                        
                        await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
                    }

                    if (!nextLink) {
                        hasNext = false;
                    } else {
                        currentPage++;
                    }
                    
                    // Update progress after completing a page
                    db.prepare('UPDATE sync_state SET current_page = ?, current_category = ?, last_updated = ? WHERE name = ?')
                      .run(currentPage, cat, Date.now(), 'full_catalog');

                } catch (e: any) {
                    console.error(`[Sync] Page Failed: ${cat} p${currentPage}`, e.message);
                    db.prepare('UPDATE sync_state SET error_count = error_count + 1, last_error = ? WHERE name = ?')
                      .run(`Page ${cat}${currentPage}: ${e.message}`, 'full_catalog');
                    
                    // On page failure, wait longer and retry or skip? 
                    // Let's wait 5s and let the loop continue (it will retry current page because currentPage hasn't incremented)
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
        }

        db.prepare('UPDATE sync_state SET status = ?, last_updated = ? WHERE name = ?').run('finished', Date.now(), 'full_catalog');
    } catch (error: any) {
        console.error('[Sync] Critical error:', error);
        db.prepare('UPDATE sync_state SET status = ?, last_error = ?, last_updated = ? WHERE name = ?')
          .run('error', error.message, Date.now(), 'full_catalog');
    } finally {
        isSyncing = false;
        console.log('[Sync] Process ended.');
    }
}
