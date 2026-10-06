import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { lineIdOf, type CustomerJoin } from '@/lib/line';

export const dynamic = 'force-dynamic';

type TokenState =
  | { code: 'missing' }
  | { code: 'ok'; name: string }
  | { code: 'rejected'; status: number; body: string }
  | { code: 'unreachable'; message: string };

// Checks the LINE setup end to end rather than just asking whether the
// variables exist: a token that is present but revoked, or issued against the
// wrong channel, fails here exactly as it would on a real status message.
export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const liffId = process.env.LINE_LIFF_ID ?? null;

  let bot: { displayName: string; basicId: string; userId: string } | null = null;
  let tokenOk = false;
  // A state the page can word itself, rather than a sentence in one language:
  // the shop may be reading the admin in Thai or in English.
  let token_state: TokenState;

  if (!token) {
    token_state = { code: 'missing' };
  } else {
    try {
      const res = await fetch('https://api.line.me/v2/bot/info', {
        headers: { authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        bot = await res.json();
        tokenOk = true;
        token_state = { code: 'ok', name: bot?.displayName ?? 'the official account' };
      } else {
        const body = await res.text().catch(() => '');
        token_state = { code: 'rejected', status: res.status, body: body.slice(0, 200) };
      }
    } catch (e) {
      token_state = { code: 'unreachable', message: (e as Error).message };
    }
  }

  // How many recent orders actually carry a LINE id. If this is 0 the problem
  // is on the customer side, not here.
  const admin = supabaseAdmin();
  const { data: recent } = await admin
    .from('orders')
    .select('id, customers(line_user_id)')
    .order('created_at', { ascending: false })
    .limit(10);
  const rows = (recent ?? []) as unknown as { customers: CustomerJoin }[];
  const withLine = rows.filter((r) => lineIdOf(r.customers)).length;

  // New-order alerts are sent by the customer site, which has its own copy of
  // the token. Ask it directly, because a variable missing over there is
  // invisible from here and looks exactly like everything working.
  const site = process.env.CUSTOMER_SITE_URL ?? 'https://mrbigbelly-order.netlify.app';
  let customer: { reachable: boolean; lineToken: boolean } = { reachable: false, lineToken: false };
  try {
    const r = await fetch(`${site}/api/health`, { cache: 'no-store' });
    if (r.ok) {
      const j = (await r.json()) as { lineToken?: boolean };
      customer = { reachable: true, lineToken: Boolean(j.lineToken) };
    }
  } catch { /* left as unreachable */ }

  return NextResponse.json({
    tokenOk,
    token: token_state,
    liffId,
    bot,
    recent: { total: rows.length, withLine },
    customer,
  });
}
