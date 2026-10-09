import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { pushLine } from '@/lib/line';

/** Adding or taking away points by hand, which the customer is told about. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { delta, note } = (await req.json()) as { delta: number; note?: string };
  if (!Number.isInteger(delta) || delta === 0) {
    return NextResponse.json({ error: 'delta must be a whole number other than zero' }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: customer } = await admin
    .from('customers')
    .select('id, line_user_id, points_balance')
    .eq('id', id)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: 'no such member' }, { status: 404 });

  // Nobody ends up owing the shop points: the floor is zero.
  if (delta < 0 && customer.points_balance + delta < 0) {
    return NextResponse.json({ error: 'balance', balance: customer.points_balance }, { status: 409 });
  }

  const { error } = await admin.from('point_events').insert({
    customer_id: id,
    delta,
    kind: 'manual',
    note: note?.trim() || null,
    created_by: user.email ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const balance = customer.points_balance + delta;
  const reason = note?.trim() ? `\n${note.trim()}` : '';
  const push = await pushLine(
    customer.line_user_id,
    delta > 0
      ? `⭐ ร้านเพิ่มแต้มให้คุณ ${delta} แต้ม${reason}\nแต้มสะสมทั้งหมด ${balance} แต้ม\n\n`
        + `Mr. Big Belly added ${delta} points to your account. You now have ${balance}.`
      : `ร้านปรับแต้มของคุณ ${delta} แต้ม${reason}\nแต้มสะสมทั้งหมด ${balance} แต้ม\n\n`
        + `Mr. Big Belly adjusted your points by ${delta}. You now have ${balance}.`,
  );

  return NextResponse.json({ ok: true, balance, push });
}
