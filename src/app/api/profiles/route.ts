import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
    return NextResponse.json({ profiles: users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, icon } = await req.json();
    if (!name || !icon) return NextResponse.json({ error: 'Invalid profile data' }, { status: 400 });

    const id = `user-${Date.now()}`;
    db.prepare('INSERT INTO users (id, name, icon, created_at) VALUES (?, ?, ?, ?)').run(id, name, icon, Date.now());
    
    return NextResponse.json({ success: true, profile: { id, name, icon } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
