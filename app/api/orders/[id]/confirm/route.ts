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

  const lineId = (order as { customers: { line_user_id: string } | null } | null)?.customers?.line_user_id;
  if (lineId) {
    await pushLine(lineId, `✅ Your Mr. Big Belly order is confirmed. Ready in about ${prep_minutes} min.`);
  }
  return NextResponse.json({ ok: true });
}
