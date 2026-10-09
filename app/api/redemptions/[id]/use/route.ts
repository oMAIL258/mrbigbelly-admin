import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';

/** Marking an approved reward as handed over at the counter. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const admin = supabaseAdmin();
  const { data, error } = await admin.from('redemptions')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'approved')
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Nothing updated means somebody already handed it over.
  if (!data) return NextResponse.json({ error: 'not approved' }, { status: 409 });

  return NextResponse.json({ ok: true });
}
