import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { pushLine, lineIdOf, type CustomerJoin } from '@/lib/line';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { reason } = (await req.json()) as { reason: string };
  const admin = supabaseAdmin();
  const { data: order, error } = await admin.from('orders')
    .update({ status: 'rejected', reject_reason: reason, rejected_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, customers(line_user_id)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const push = await pushLine(
    lineIdOf((order as { customers: CustomerJoin } | null)?.customers),
    `❌ Your Mr. Big Belly order was declined.\nReason: ${reason}\n\nIf you were charged we will refund you here on LINE.`,
  );
  return NextResponse.json({ ok: true, push });
}
