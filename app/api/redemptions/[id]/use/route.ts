import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { pushLine } from '@/lib/line';

type Row = {
  id: string;
  discount_satang: number | null;
  reward_title_th: string;
  reward_title_en: string;
  customers: { line_user_id: string | null } | { line_user_id: string | null }[] | null;
};

const lineId = (c: Row['customers']) => (Array.isArray(c) ? c[0] : c)?.line_user_id ?? null;

/**
 * Spending an approved reward at the counter: a free item handed over, or a
 * discount taken off a bill paid in the shop. Either way it is the same act —
 * the reward is spent here rather than on a website order — so the row is
 * marked used and cannot be spent again on either side.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const admin = supabaseAdmin();
  const { data, error } = await admin.from('redemptions')
    .update({ status: 'used', used_at: new Date().toISOString(), decided_by: user.email ?? null })
    .eq('id', id)
    .eq('status', 'approved')
    .select('id, discount_satang, reward_title_th, reward_title_en, customers(line_user_id)')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Nothing updated means it had already been spent — at the counter, or on an
  // order while the till was looking at it.
  if (!data) return NextResponse.json({ error: 'not approved' }, { status: 409 });

  // The customer gets told their reward has been spent, so a discount cannot
  // quietly disappear from their account with nothing to show for it.
  const row = data as unknown as Row;
  const off = row.discount_satang;
  const push = await pushLine(
    lineId(row.customers),
    off
      ? `✅ ใช้ส่วนลดที่ร้านแล้ว: ${row.reward_title_th}\n`
        + `หัก ฿${(off / 100).toLocaleString('en-US')} จากบิลที่ร้าน\n\n`
        + `Used in store: ${row.reward_title_en}\n`
        + `฿${(off / 100).toLocaleString('en-US')} taken off your bill at the shop.`
      : `✅ รับของรางวัลแล้ว: ${row.reward_title_th}\n\n`
        + `Collected: ${row.reward_title_en}\nThanks for coming in.`,
  );

  return NextResponse.json({ ok: true, push });
}
