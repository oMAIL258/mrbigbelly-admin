import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { normalisePhone, looksLikeThaiPhone } from '@/lib/phone';

/**
 * Putting a phone number on a member's record, so the counter can find them.
 * Used for the walk-in who gave their number across the counter rather than
 * typing it into the website themselves.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { phone } = (await req.json()) as { phone?: string | null };
  const raw = (phone ?? '').trim();

  // An empty box means taking the number off the record.
  const next = raw ? normalisePhone(raw) : null;
  if (raw && !looksLikeThaiPhone(raw)) {
    return NextResponse.json({ error: 'phone' }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { error } = await admin.from('customers').update({ phone: next }).eq('id', id);
  if (error) {
    // Two accounts holding one number would leave the counter unable to tell
    // which person it is looking at, so the database refuses it.
    const taken = error.code === '23505' || /customers_phone_unique/.test(error.message);
    return NextResponse.json({ error: taken ? 'taken' : error.message }, { status: taken ? 409 : 500 });
  }

  return NextResponse.json({ ok: true, phone: next });
}
