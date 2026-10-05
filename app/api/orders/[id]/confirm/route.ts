import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { pushLine } from '@/lib/line';

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

  const row = order as { fulfilment_mode: 'pickup' | 'delivery'; customers: { line_user_id: string } | null } | null;
  const lineId = row?.customers?.line_user_id;
  if (lineId) {
    const tail = row!.fulfilment_mode === 'pickup'
      ? `Ready for pickup in about ${prep_minutes} min.`
      : `We'll have it with you in about ${prep_minutes} min.`;
    await pushLine(lineId, `👨‍🍳 Payment received — we're preparing your Mr. Big Belly order. ${tail}`);
  }
  return NextResponse.json({ ok: true });
}
