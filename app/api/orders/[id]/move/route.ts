import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { pushLine } from '@/lib/line';

const MESSAGES: Record<string, string> = {
  ready: '🍴 Your Mr. Big Belly order is ready!',
  done: '👍 Your Mr. Big Belly order is marked complete. Thank you!',
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { to } = (await req.json()) as { to: 'ready' | 'done' };
  if (!['ready', 'done'].includes(to)) return NextResponse.json({ error: 'bad to' }, { status: 400 });

  const admin = supabaseAdmin();
  const col = to === 'ready' ? 'ready_at' : 'done_at';
  const { data: order, error } = await admin.from('orders')
    .update({ status: to, [col]: new Date().toISOString() })
    .eq('id', id)
    .select('*, customers(line_user_id)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lineId = (order as { customers: { line_user_id: string } | null } | null)?.customers?.line_user_id;
  if (lineId && MESSAGES[to]) await pushLine(lineId, MESSAGES[to]);
  return NextResponse.json({ ok: true });
}
