import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { pushLine, orderLink, lineIdOf, type CustomerJoin } from '@/lib/line';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { prep_minutes } = (await req.json()) as { prep_minutes: number };
  const admin = supabaseAdmin();
  const { data: order, error } = await admin.from('orders')
    .update({ status: 'confirmed', prep_minutes, confirmed_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, customers(line_user_id)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = order as { fulfilment_mode: 'pickup' | 'delivery'; customers: CustomerJoin };
  const pickup = row.fulfilment_mode === 'pickup';
  const link = orderLink(id);
  const push = await pushLine(
    lineIdOf(row.customers),
    '👨‍🍳 ได้รับการชำระเงินแล้ว กำลังเตรียมอาหารของคุณ\n'
    + (pickup
      ? `พร้อมให้มารับในอีกประมาณ ${prep_minutes} นาที`
      : `จะไปถึงคุณในอีกประมาณ ${prep_minutes} นาที`)
    + '\n\n'
    + "Payment received — we're preparing your Mr. Big Belly order.\n"
    + (pickup
      ? `Ready for pickup in about ${prep_minutes} minutes.`
      : `We'll have it with you in about ${prep_minutes} minutes.`)
    + (link ? `\n\nติดตามคำสั่งซื้อ / Follow your order: ${link}` : ''),
  );

  return NextResponse.json({ ok: true, push });
}
