import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';

async function getUserId() {
  // In Next.js 15 cookies() is asynchronous
  const cookieStore = await cookies();
  const activeProfile = cookieStore.get('active_profile_id')?.value;
  return activeProfile || 'default-zorg'; // Fallback to auto-generated default user
}

export async function GET() {
  try {
    const userId = await getUserId();
    const items = db.prepare('SELECT * FROM watchlist WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as any[];
    
    // Auto-parse status JSON before sending
    const parsedItems = items.map(item => {
        if (item.status) {
            try { item.status = JSON.parse(item.status); } catch(e) {}
        }
        return item;
    });

    return NextResponse.json({ items: parsedItems });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    const body = await req.json();
    const { url, title, poster, type, status } = body; // type = 'watching' | 'plan_to_watch' | 'remove'
    
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

    const id = `wl-${Date.now()}`;
    const now = Date.now();

    const existing = db.prepare('SELECT id FROM watchlist WHERE user_id = ? AND url = ?').get(userId, url) as { id: string } | undefined;
    
    if (existing) {
      if (type === 'remove') {
          db.prepare('DELETE FROM watchlist WHERE id = ?').run(existing.id);
      } else {
          // Coalesce types dynamically so updates don't break existing props if undefined
          db.prepare(`
              UPDATE watchlist 
              SET type = COALESCE(?, type), 
                  status = COALESCE(?, status), 
                  updated_at = ? 
              WHERE id = ?
          `).run(
              type || null, 
              status ? JSON.stringify(status) : null, 
              now, 
              existing.id
          );
      }
    } else if (type !== 'remove') {
      db.prepare(`
        INSERT INTO watchlist (id, user_id, url, title, poster, type, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, 
        userId, 
        url, 
        title, 
        poster, 
        type || 'plan_to_watch', 
        status ? JSON.stringify(status) : null, 
        now
      );
    }
    
    return NextResponse.json({ success: true, timestamp: now });
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
