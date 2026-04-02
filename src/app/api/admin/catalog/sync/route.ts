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
    isSyncing = true;
    try {
        const categories = [
            '/movies/',
            '/series/',
            '/animation/',
            '/anime/',
            '/cartoons/'
        ];

        for (const cat of categories) {
            let currentPage = 1;
            let hasNext = true;

            while (hasNext) {
                // Check if we should stop
                const state = db.prepare('SELECT status FROM sync_state WHERE name = ?').get('full_catalog') as any;
                if (state?.status !== 'running') break;

                console.log(`[Sync] Fetching ${cat} page ${currentPage}`);
                const { items, nextLink } = await fetchCatalogPage(`${cat}page/${currentPage}/`, userAgent);
                
                for (const itemUrl of items) {
                    // Check if already indexed recently? Or just upsert
                    console.log(`[Sync] Indexing ${itemUrl}`);
                    try {
                        const details = await fetchPageDetails(itemUrl, userAgent);
                        
                        db.prepare(`
                            INSERT INTO catalog (id, url, title, orig_title, poster, type, year, genres, translations, seasons, episodes, last_indexed_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(id) DO UPDATE SET
                                title = excluded.title,
                                orig_title = excluded.orig_title,
                                poster = excluded.poster,
                                year = excluded.year,
                                genres = excluded.genres,
                                translations = excluded.translations,
                                seasons = excluded.seasons,
                                episodes = excluded.episodes,
                                last_indexed_at = excluded.last_indexed_at
                        `).run(
                            details.id, details.url, details.title, details.orig_title, 
                            details.poster, details.type, details.year, details.genres,
                            details.translations, details.seasons, details.episodes, Date.now()
                        );

                        // Increment items indexed
                        db.prepare('UPDATE sync_state SET items_indexed = items_indexed + 1 WHERE name = ?').run('full_catalog');
                    } catch (e) {
                        console.error(`[Sync] Failed to index ${itemUrl}:`, e);
                    }
                    
                    // Small delay to avoid block 
                    await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
                }

                if (!nextLink) break;
                currentPage++;
                
                // Update progress
                db.prepare('UPDATE sync_state SET current_page = ?, last_updated = ? WHERE name = ?').run(currentPage, Date.now(), 'full_catalog');
            }
        }

        db.prepare('UPDATE sync_state SET status = ?, last_updated = ? WHERE name = ?').run('finished', Date.now(), 'full_catalog');
    } catch (error) {
        console.error('[Sync] Critical error:', error);
        db.prepare('UPDATE sync_state SET status = ?, last_updated = ? WHERE name = ?').run('error', Date.now(), 'full_catalog');
    } finally {
        isSyncing = false;
    }
}
