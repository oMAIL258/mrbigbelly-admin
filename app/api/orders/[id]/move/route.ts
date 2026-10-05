import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { pushLine } from '@/lib/line';

function message(to: 'ready' | 'done', mode: 'pickup' | 'delivery') {
  if (to === 'ready') {
    return mode === 'pickup'
      ? '🍴 Your Mr. Big Belly order is ready for pickup!'
      : '🛵 Your Mr. Big Belly order is on its way to you now.';
  }
  return mode === 'pickup'
    ? '👍 Thanks for picking up your Mr. Big Belly order. See you next time!'
    : '✅ Your Mr. Big Belly order has been delivered. Enjoy!';
}

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

  const row = order as { fulfilment_mode: 'pickup' | 'delivery'; customers: { line_user_id: string } | null } | null;
  const lineId = row?.customers?.line_user_id;
  if (lineId) await pushLine(lineId, message(to, row!.fulfilment_mode));
  return NextResponse.json({ ok: true });
}
