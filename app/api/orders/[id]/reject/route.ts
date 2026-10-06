import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { pushLine, lineIdOf, type CustomerJoin } from '@/lib/line';

// Both languages, because a push cannot be switched after it arrives and the
// customer may be reading either. Keyed by code so the shop's own language has
// no bearing on what the customer is told.
const REASONS: Record<string, { th: string; en: string }> = {
  payment: { th: 'ตรวจสอบการชำระเงินไม่ได้', en: 'Payment could not be verified' },
  stock: { th: 'ของหมด', en: 'Out of stock' },
  hours: { th: 'นอกเวลาทำการ', en: 'Outside operating hours' },
  area: { th: 'ไม่ได้ส่งในพื้นที่นี้', en: 'Delivery area not covered' },
  other: { th: 'เหตุผลอื่น', en: 'Another reason' },
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  // `reason` is what the old admin build sent: free text in one language.
  const { reason_code, reason } = (await req.json()) as { reason_code?: string; reason?: string };
  const code = reason_code && REASONS[reason_code] ? reason_code : null;
  const words = code ? REASONS[code] : { th: reason ?? '', en: reason ?? '' };

  const admin = supabaseAdmin();
  const { data: order, error } = await admin.from('orders')
    .update({ status: 'rejected', reject_reason: code ?? reason ?? null, rejected_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, customers(line_user_id)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const push = await pushLine(
    lineIdOf((order as { customers: CustomerJoin } | null)?.customers),
    `❌ คำสั่งซื้อของคุณถูกปฏิเสธ\nเหตุผล: ${words.th}\nหากคุณชำระเงินมาแล้ว ทางร้านจะคืนเงินให้ทาง LINE\n\n`
    + `Your Mr. Big Belly order was declined.\nReason: ${words.en}\nIf you were charged we will refund you here on LINE.`,
  );
  return NextResponse.json({ ok: true, push });
}
