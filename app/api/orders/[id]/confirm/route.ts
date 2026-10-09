import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { pushLine, orderLink, lineIdOf, type CustomerJoin } from '@/lib/line';
import { awardForOrder } from '@/lib/loyalty';

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

  // Payment is verified at this point, so this is where the order earns.
  const earned = await awardForOrder(admin, id);

  const row = order as { fulfilment_mode: 'pickup' | 'delivery'; customers: CustomerJoin };
  const pickup = row.fulfilment_mode === 'pickup';
  const link = orderLink(id);
  // The points are told to the customer here rather than in a message of their
  // own, so one notification covers the whole confirmation. A first order can
  // carry a welcome bonus, which is said out loud: otherwise the balance jumps
  // by more than the order was worth with nothing to explain it.
  const welcome = earned && earned.welcome > 0
    ? { th: `\n🎁 รวมแต้มต้อนรับสมาชิกใหม่ ${earned.welcome} แต้ม`,
        en: `\n${earned.welcome} of those are a welcome bonus for your first order.` }
    : { th: '', en: '' };
  const points = earned && earned.total > 0
    ? `\n\n⭐ ได้รับ ${earned.total} แต้ม (รวมทั้งหมด ${earned.balance} แต้ม)`
      + welcome.th
      + `\nYou earned ${earned.total} points — ${earned.balance} in total.`
      + welcome.en
    : '';
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
    + points
    + (link ? `\n\nติดตามคำสั่งซื้อ / Follow your order: ${link}` : ''),
  );

  return NextResponse.json({ ok: true, push, earned });
}
