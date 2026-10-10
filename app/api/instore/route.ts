import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { pushLine } from '@/lib/line';
import { recordVisit } from '@/lib/loyalty';
import { baht } from '@/lib/money';

/** ฿100,000 on one bill is a slipped decimal point rather than a meal. */
const CEILING_SATANG = 10_000_000;

/** A second Save within this long, for the same person and amount, is a double tap. */
const DOUBLE_TAP_MS = 120_000;

/**
 * A customer ate in the shop. The counter types their phone number and what
 * they spent; this writes the visit down and credits the points it was worth.
 */
export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const body = (await req.json()) as {
    customer_id?: string;
    amount_satang?: number;
    note?: string;
    /** Set once the counter has said yes to a repeat of the same amount. */
    again?: boolean;
  };

  const amount = Math.round(Number(body.amount_satang));
  if (!body.customer_id) return NextResponse.json({ error: 'no member' }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount' }, { status: 400 });
  }
  if (amount > CEILING_SATANG) return NextResponse.json({ error: 'too much' }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: customer } = await admin
    .from('customers')
    .select('id, display_name, line_user_id')
    .eq('id', body.customer_id)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: 'no member' }, { status: 404 });

  // Pressing Save twice should not pay for the same meal twice. There is no
  // bill number to key on the way an order has one, so the shape of the
  // mistake is what is caught: the same person, the same amount, moments
  // apart. The counter can still say it meant it.
  if (!body.again) {
    const { data: recent } = await admin
      .from('store_visits')
      .select('id, created_at')
      .eq('customer_id', customer.id)
      .eq('amount_satang', amount)
      .gte('created_at', new Date(Date.now() - DOUBLE_TAP_MS).toISOString())
      .limit(1);
    if (recent?.length) {
      return NextResponse.json({ error: 'repeat', at: recent[0].created_at }, { status: 409 });
    }
  }

  // Any points that had already run out go before the new ones are added, so
  // the total the customer is told is the total they actually have.
  await admin.rpc('expire_points', { p_customer: customer.id });

  const result = await recordVisit(admin, {
    customerId: customer.id,
    amountSatang: amount,
    note: body.note,
    by: user.email ?? null,
  });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 });

  const { points, welcome, total, balance } = result;
  const spent = baht(amount);

  // Nothing about this is visible to the customer unless the shop tells them,
  // and a meal that earned nothing is worth saying too — otherwise the first
  // they hear of it is wondering where their points went.
  const push = await pushLine(
    customer.line_user_id,
    total > 0
      ? `⭐ ขอบคุณที่มาทานที่ร้าน\nยอด ${spent} ได้รับ ${points} แต้ม`
        + (welcome > 0 ? `\n+ ${welcome} แต้มต้อนรับสมาชิกใหม่` : '')
        + `\nแต้มสะสมทั้งหมด ${balance} แต้ม\n\n`
        + `Thanks for eating with us. ${spent} earned you ${points} points`
        + (welcome > 0 ? ` plus ${welcome} welcome points` : '')
        + `. You now have ${balance}.`
      : `ขอบคุณที่มาทานที่ร้าน\nยอด ${spent} บันทึกไว้แล้ว\nแต้มสะสมทั้งหมด ${balance} แต้ม\n\n`
        + `Thanks for eating with us. We have noted ${spent}. You have ${balance} points.`,
  );

  return NextResponse.json({ ok: true, points, welcome, total, balance, push });
}
