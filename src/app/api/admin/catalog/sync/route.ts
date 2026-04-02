import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { fetchCatalogPage, fetchPageDetails, type CatalogItem, DEFAULT_MIRRORS } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// In-memory sync state
// ---------------------------------------------------------------------------
let isSyncing = false;
let globalCooldownUntil = 0; // Timestamp for rate-limit pauses

// ---------------------------------------------------------------------------
// Concurrency pool helper
// Runs `tasks` with at most `limit` in-flight at a time.
// Includes mandatory staggering between starts to avoid bursting.
// ---------------------------------------------------------------------------
async function pooledMap<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
    const results: PromiseSettledResult<R>[] = new Array(items.length);
    let nextIndex = 0;

    async function worker() {
        while (nextIndex < items.length) {
            // Check global cooldown before starting a new request
            if (Date.now() < globalCooldownUntil) {
                const wait = globalCooldownUntil - Date.now();
                console.log(`[Sync] Worker waiting for global cooldown... (${Math.ceil(wait/1000)}s)`);
                await new Promise(r => setTimeout(r, wait + 500));
            }

            const index = nextIndex++;
            // MANDATORY STAGGER: 500-1500ms delay between *starting* requests
            // This prevents even a low concurrency pool from firing requests simultaneously.
            await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
            
            try {
                results[index] = { status: 'fulfilled', value: await fn(items[index]) };
            } catch (err: any) {
                // If we hit a rate limit (503), trigger the global cooldown for all workers
                if (err.message?.includes('503')) {
                    globalCooldownUntil = Date.now() + 60000; // Pause for 60 seconds
                    console.error(`[Sync] Global 503 Detected! Cooldown triggered for 60s.`);
                }
                results[index] = { status: 'rejected', reason: err };
            }
        }
    }

    const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
    await Promise.all(workers);
    return results;
}

// ---------------------------------------------------------------------------
// Prepared statements (cached for efficiency)
// ---------------------------------------------------------------------------
const stmtGetState    = db.prepare('SELECT * FROM sync_state WHERE name = ?');
const stmtGetStatus   = db.prepare('SELECT status FROM sync_state WHERE name = ?');
const stmtSetRunning  = db.prepare(`
    INSERT INTO sync_state (name, current_page, status, last_updated)
    VALUES ('full_catalog', 1, 'running', ?)
    ON CONFLICT(name) DO UPDATE SET status = 'running', last_updated = ?
`);
const stmtSetStatus   = db.prepare('UPDATE sync_state SET status = ?, last_updated = ? WHERE name = ?');
const stmtReset       = db.prepare(`
    INSERT INTO sync_state (name, current_page, current_category, total_pages, items_indexed,
        error_count, missed_pages, last_error, status, last_updated)
    VALUES ('full_catalog', 1, NULL, 0, 0, 0, 0, NULL, 'idle', ?)
    ON CONFLICT(name) DO UPDATE SET
        current_page = 1, current_category = NULL, total_pages = 0,
        items_indexed = 0, error_count = 0, missed_pages = 0,
        last_error = NULL, status = 'idle', last_updated = ?
`);
const stmtSaveProgress = db.prepare(`
    UPDATE sync_state
    SET current_page = ?, current_category = ?, total_pages = ?, last_updated = ?
    WHERE name = ?
`);
const stmtCounters = db.prepare(`
    UPDATE sync_state
    SET items_indexed = items_indexed + ?,
        error_count   = error_count   + ?,
        missed_pages  = missed_pages  + ?,
        last_error    = COALESCE(?, last_error),
        last_updated  = ?
    WHERE name = ?
`);
const stmtUpsertItem = db.prepare(`
    INSERT INTO catalog (id, url, title, orig_title, poster, type, year, genres, country,
        translations, seasons, episodes, last_indexed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        title          = excluded.title,
        orig_title     = excluded.orig_title,
        poster         = excluded.poster,
        year           = excluded.year,
        genres         = excluded.genres,
        country        = excluded.country,
        translations   = excluded.translations,
        seasons        = excluded.seasons,
        episodes       = excluded.episodes,
        last_indexed_at = excluded.last_indexed_at
`);

// ---------------------------------------------------------------------------
// GET — return current sync state
// ---------------------------------------------------------------------------
export async function GET() {
    const state = stmtGetState.get('full_catalog');
    return NextResponse.json(state || { status: 'idle' });
}

// ---------------------------------------------------------------------------
// POST — start | stop | reset
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
    const body = await request.json();
    const { action, concurrency = 3, mirrors = DEFAULT_MIRRORS } = body as { action: string; concurrency?: number; mirrors?: string[] };
    const userAgent = request.headers.get('user-agent') ?? undefined;

    if (action === 'start') {
        if (isSyncing) {
            return NextResponse.json({ error: 'Sync already in progress' }, { status: 400 });
        }
        const existing = stmtGetState.get('full_catalog') as any;
        if (existing?.status === 'running') {
            return NextResponse.json({ error: 'Sync already in progress (DB)' }, { status: 400 });
        }

        stmtSetRunning.run(Date.now(), Date.now());

        // Fire-and-forget; errors are written back to DB inside runSync
        runSync(userAgent, Math.max(1, Math.min(concurrency, 20)), mirrors).catch(console.error);

        return NextResponse.json({ message: 'Sync started', concurrency, mirrors });
    }

    if (action === 'stop') {
        // Reset both the in-memory flag AND the DB row so a new sync can start immediately
        isSyncing = false;
        stmtSetStatus.run('idle', Date.now(), 'full_catalog');
        return NextResponse.json({ message: 'Sync stopped.' });
    }

    if (action === 'reset') {
        if (isSyncing) {
            return NextResponse.json({ error: 'Cannot reset while sync is running. Stop first.' }, { status: 400 });
        }
        stmtReset.run(Date.now(), Date.now());
        return NextResponse.json({ message: 'Sync state reset.' });
    }

    return NextResponse.json({ error: 'Invalid action. Use: start | stop | reset' }, { status: 400 });
}

// ---------------------------------------------------------------------------
// runSync — main background worker
// ---------------------------------------------------------------------------
async function runSync(userAgent: string | undefined, concurrency: number, mirrors: string[]) {
    if (isSyncing) return;
    isSyncing = true;
    
    let mirrorIndex = 0;
    const getActiveMirror = () => mirrors[mirrorIndex % mirrors.length];

    const categories = [
        '/movies/',
        '/series/',
        '/animation/',
        '/anime/',
        '/cartoons/',
    ];

    try {
        // Determine resume point
        const state = stmtGetState.get('full_catalog') as any;
        let startCatIndex = 0;
        let startPage = 1;

        if (state?.current_category) {
            const idx = categories.indexOf(state.current_category);
            if (idx !== -1) {
                startCatIndex = idx;
                startPage = state.current_page || 1;
                console.log(`[Sync] Resuming from ${state.current_category} page ${startPage}`);
            }
        }

        for (let i = startCatIndex; i < categories.length; i++) {
            const cat = categories[i];
            let currentPage = (i === startCatIndex) ? startPage : 1;
            let hasNext = true;

            while (hasNext) {
                // ── Stop check ─────────────────────────────────────────────
                const liveStatus = stmtGetStatus.get('full_catalog') as any;
                if (!liveStatus || liveStatus.status !== 'running') {
                    console.log(`[Sync] Stop requested (status=${liveStatus?.status}). Exiting.`);
                    return;
                }

                // ── Save progress BEFORE fetching so resume is exact ──────
                // We don't know total_pages yet on the first call; it will be filled below
                const savedTotal = (stmtGetState.get('full_catalog') as any)?.total_pages ?? 0;
                stmtSaveProgress.run(currentPage, cat, savedTotal, Date.now(), 'full_catalog');

                const activeMirror = getActiveMirror();
                console.log(`[Sync] [${cat}] Page ${currentPage} | concurrency=${concurrency} | mirror=${activeMirror}`);

                // ── Fetch catalog page (list of item URLs) ────────────────
                let items: string[] = [];
                let nextLink: string | undefined;
                let totalPages = savedTotal;

                try {
                    const result = await fetchCatalogPage(`${cat}page/${currentPage}/`, userAgent, activeMirror);
                    items = result.items;
                    nextLink = result.nextLink;
                    totalPages = result.totalPages;

                    // Persist updated total pages
                    stmtSaveProgress.run(currentPage, cat, totalPages, Date.now(), 'full_catalog');
                } catch (e: any) {
                    console.error(`[Sync] Page fetch failed: ${cat} p${currentPage} — ${e.message}`);

                    // Skip the broken page (do NOT retry indefinitely — that was the old bug)
                    stmtCounters.run(0, 1, 1, `Page ${cat}${currentPage}: ${e.message}`, Date.now(), 'full_catalog');

                    // If we hit a rate limit (503) or forbidden (403), switch mirror for next attempt
                    if (e.message?.includes('503') || e.message?.includes('403')) {
                        mirrorIndex++;
                        console.warn(`[Sync] ${e.message?.includes('403') ? '403 Forbidden' : '503 Rate Limit'} on catalog page. Rotating mirror to: ${getActiveMirror()}`);
                    }

                    // Exponential backoff before moving on
                    const backoff = Math.min(5000 * Math.pow(2, 0), 30000);
                    await new Promise(r => setTimeout(r, backoff));

                    // Advance past the broken page
                    currentPage++;
                    if (!nextLink && items.length === 0) {
                        // If we can't tell whether there's a next page, be conservative:
                        // try currentPage + 1 once more; the stop check will abort if no items
                        if (currentPage > (totalPages || currentPage)) hasNext = false;
                    }
                    continue;
                }

                if (items.length === 0) {
                    console.log(`[Sync] [${cat}] Page ${currentPage} returned 0 items. Moving on.`);
                    hasNext = false;
                    continue;
                }

                // ── Fetch item details in parallel (concurrency pool) ─────
                const allDetails: Partial<CatalogItem>[] = [];
                let itemErrors = 0;
                let lastItemError: string | null = null;

                const settled = await pooledMap(items, concurrency, async (itemUrl) => {
                    const res = await fetchPageDetails(itemUrl, userAgent, getActiveMirror());
                    return res;
                });

                for (let j = 0; j < settled.length; j++) {
                    const result = settled[j];
                    if (result.status === 'fulfilled') {
                        allDetails.push(result.value);
                    } else {
                        itemErrors++;
                        const reason = result.reason?.message ?? result.reason;
                        lastItemError = `Item ${items[j]}: ${reason}`;
                        console.error(`[Sync] Item failed: ${items[j]}`, reason);

                        // Rotation logic for items: if we see 503/403, rotate mirror
                        if (reason?.includes('503') || reason?.includes('403')) {
                           mirrorIndex++;
                           console.warn(`[Sync] ${reason?.includes('403') ? '403 Forbidden' : '503 Rate Limit'} on item. Rotating mirror to: ${getActiveMirror()}`);
                        }
                    }
                }

                // ── Batch upsert into DB (single transaction) ─────────────
                const now = Date.now();
                const batchUpsert = db.transaction((rows: typeof allDetails) => {
                    for (const d of rows) {
                        if (!d.id || !d.title) continue;
                        stmtUpsertItem.run(
                            d.id, d.url, d.title, d.orig_title ?? null,
                            d.poster ?? null, d.type ?? null, d.year ?? null,
                            d.genres ?? null, d.country ?? null,
                            d.translations ?? null, d.seasons ?? null,
                            d.episodes ?? null, now
                        );
                    }
                });
                batchUpsert(allDetails);

                // ── Update counters in a single write ────────────────────
                stmtCounters.run(
                    allDetails.length,
                    itemErrors,
                    0,
                    lastItemError,
                    Date.now(),
                    'full_catalog'
                );

                console.log(
                    `[Sync] [${cat}] Page ${currentPage}/${totalPages} done` +
                    ` — saved ${allDetails.length}, failed ${itemErrors}`
                );

                // ── Advance page ─────────────────────────────────────────
                if (!nextLink) {
                    hasNext = false;
                } else {
                    currentPage++;
                    // Moderate courtesy delay between pages
                    await new Promise(r => setTimeout(r, 1500));
                }
            }
        }

        stmtSetStatus.run('finished', Date.now(), 'full_catalog');
        console.log('[Sync] All categories done. Status → finished.');
    } catch (error: any) {
        console.error('[Sync] Critical error:', error);
        db.prepare(
            'UPDATE sync_state SET status = ?, last_error = ?, last_updated = ? WHERE name = ?'
        ).run('error', error.message, Date.now(), 'full_catalog');
    } finally {
        isSyncing = false;
        console.log('[Sync] Process ended.');
    }
}
