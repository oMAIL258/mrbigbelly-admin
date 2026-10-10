import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { pushLine } from '@/lib/line';
import { shortCode } from '@/lib/loyalty';

type Row = {
  id: string;
  status: string;
  points_cost: number;
  discount_satang: number | null;
  reward_id: string | null;
  reward_title_th: string;
  reward_title_en: string;
  customer_id: string;
  code: string | null;
  customers: { line_user_id: string | null } | { line_user_id: string | null }[] | null;
};

const lineId = (c: Row['customers']) => (Array.isArray(c) ? c[0] : c)?.line_user_id ?? null;

/** The shop saying yes or no to a customer's request to use a reward. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { decision, reason } = (await req.json()) as { decision: 'approved' | 'rejected'; reason?: string };
  if (decision !== 'approved' && decision !== 'rejected') {
    return NextResponse.json({ error: 'bad decision' }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: before } = await admin
    .from('redemptions')
    .select('*, customers(line_user_id)')
    .eq('id', id)
    .maybeSingle();
  const row = before as Row | null;
  if (!row) return NextResponse.json({ error: 'no such request' }, { status: 404 });
  // Two people on two tills can open the same request. Only the first decides.
  if (row.status !== 'pending') {
    return NextResponse.json({ error: 'decided', status: row.status }, { status: 409 });
  }

  // Stock is not held back while a request waits, so two customers can both ask
  // for the last one. The second approval is refused rather than over-issued,
  // and declining it puts that customer's points back.
  if (decision === 'approved' && row.reward_id) {
    const { data: reward } = await admin.from('rewards').select('stock').eq('id', row.reward_id).maybeSingle();
    if (reward && reward.stock !== null && reward.stock <= 0) {
      return NextResponse.json({ error: 'out of stock' }, { status: 409 });
    }
  }

  const code = decision === 'approved' ? (row.code ?? shortCode()) : null;
  const { error } = await admin.from('redemptions').update({
    status: decision,
    reject_reason: decision === 'rejected' ? (reason?.trim() || null) : null,
    decided_at: new Date().toISOString(),
    decided_by: user.email ?? null,
    ...(code ? { code } : {}),
  }).eq('id', id).eq('status', 'pending');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (decision === 'approved') {
    if (row.reward_id) {
      const { data: reward } = await admin.from('rewards').select('stock').eq('id', row.reward_id).maybeSingle();
      if (reward && reward.stock !== null) {
        await admin.from('rewards').update({ stock: Math.max(0, reward.stock - 1) }).eq('id', row.reward_id);
      }
    }
  } else {
    // The points were taken when they asked, so they go straight back.
    await admin.from('point_events').insert({
      customer_id: row.customer_id,
      delta: row.points_cost,
      kind: 'refund',
      redemption_id: row.id,
      note: `คืนแต้ม / Refund · ${row.reward_title_en}`,
      created_by: user.email ?? null,
    });
  }

  const { data: after } = await admin
    .from('customers').select('points_balance').eq('id', row.customer_id).maybeSingle();
  const balance = after?.points_balance ?? 0;

  // A discount is spent by the customer on their next order, not handed over
  // the counter, so the message says where to find it rather than telling them
  // to show a code to nobody.
  const off = row.discount_satang;
  const baht = off ? `฿${(off / 100).toLocaleString('en-US')}` : '';
  const approved = off
    ? `🎉 อนุมัติแล้ว: ${row.reward_title_th}\n`
      + `ส่วนลด ${baht} ใช้ได้ 2 ทาง\n`
      + `• สั่งผ่านเว็บ: กดใช้ที่หน้าชำระเงินก่อนโอน ยอดจะลดให้เอง\n`
      + `• ใช้ที่ร้าน: แสดงรหัส ${code} ให้พนักงาน\n`
      + `ใช้ได้ครั้งเดียว เลือกทางใดทางหนึ่ง\nแต้มคงเหลือ ${balance} แต้ม\n\n`
      + `Approved: ${row.reward_title_en}\n`
      + `${baht} off, two ways to use it:\n`
      + `• Online: tap it on the payment screen before you transfer.\n`
      + `• In the shop: show code ${code} to the staff.\n`
      + `One use only, whichever you choose. You have ${balance} points left.`
    : `🎉 อนุมัติแล้ว: ${row.reward_title_th}\nรหัสรับสิทธิ์ ${code}\nแสดงรหัสนี้ที่ร้านเพื่อรับของรางวัล\nแต้มคงเหลือ ${balance} แต้ม\n\n`
      + `Approved: ${row.reward_title_en}\nCode ${code} — show it at the counter.\nYou have ${balance} points left.`;

  const push = await pushLine(
    lineId(row.customers),
    decision === 'approved'
      ? approved
      : `ขออภัย คำขอใช้สิทธิ์ ${row.reward_title_th} ไม่ได้รับอนุมัติ`
        + `${reason?.trim() ? `\nเหตุผล: ${reason.trim()}` : ''}`
        + `\nคืนแต้มให้แล้ว ${row.points_cost} แต้ม (คงเหลือ ${balance} แต้ม)\n\n`
        + `Sorry — your request for ${row.reward_title_en} was not approved.`
        + `${reason?.trim() ? `\nReason: ${reason.trim()}` : ''}`
        + `\nYour ${row.points_cost} points have been returned. You have ${balance}.`,
  );

  return NextResponse.json({ ok: true, code, balance, push });
}
