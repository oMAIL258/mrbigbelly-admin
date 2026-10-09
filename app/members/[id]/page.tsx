'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { baht } from '@/lib/money';
import { Nav } from '@/components/Nav';
import { useLang, statusLabel, type Lang } from '@/lib/i18n';
import { shopTime, dayKey, dayLabel } from '@/lib/day';

type Member = {
  id: string;
  display_name: string | null;
  line_user_id: string | null;
  points_balance: number;
  created_at: string;
};
type Event = {
  id: string; delta: number; kind: string; note: string | null;
  order_id: string | null; created_at: string; created_by: string | null;
};
type Order = {
  id: string; short_code: string | null; status: string;
  total_satang: number; fulfilment_mode: 'pickup' | 'delivery'; created_at: string;
};
type Claim = {
  id: string; code: string | null; status: string; points_cost: number;
  reward_title_th: string; reward_title_en: string; created_at: string;
};
type Lot = { remaining: number; expires_at: string | null };

const stamp = (iso: string, lang: Lang, words: { today: string; yesterday: string }) =>
  `${dayLabel(dayKey(iso), lang, words)} ${shopTime(iso)}`;

export default function MemberPage() {
  const { id } = useParams<{ id: string }>();
  const { lang, t } = useLang();
  const [member, setMember] = useState<Member | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [delta, setDelta] = useState(50);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const [nextExpiry, setNextExpiry] = useState<Lot | null>(null);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    // Nothing happens to a customer's points on the day they run out, so the
    // balance is brought up to date before it is read rather than shown stale.
    await sb.rpc('expire_points', { p_customer: id });
    const [m, e, o, r, lots] = await Promise.all([
      sb.from('customers').select('id, display_name, line_user_id, points_balance, created_at').eq('id', id).maybeSingle(),
      sb.from('point_events').select('*').eq('customer_id', id).order('created_at', { ascending: false }).limit(100),
      sb.from('orders').select('id, short_code, status, total_satang, fulfilment_mode, created_at')
        .eq('customer_id', id).order('created_at', { ascending: false }).limit(50),
      sb.from('redemptions').select('id, code, status, points_cost, reward_title_th, reward_title_en, created_at')
        .eq('customer_id', id).order('created_at', { ascending: false }).limit(50),
      sb.rpc('point_lots', { p_customer: id }),
    ]);
    setMember((m.data ?? null) as Member | null);
    setEvents((e.data ?? []) as Event[]);
    setOrders((o.data ?? []) as Order[]);
    setClaims((r.data ?? []) as Claim[]);
    // The soonest the customer loses anything, which is what they ask about.
    const live = ((lots.data ?? []) as Lot[])
      .filter((l) => l.remaining > 0 && l.expires_at)
      .sort((a, b) => (a.expires_at! < b.expires_at! ? -1 : 1));
    setNextExpiry(live[0] ?? null);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function adjust(sign: 1 | -1) {
    const amount = Math.abs(Math.round(delta));
    if (!amount) return;
    setBusy(true); setErr(null);
    const res = await fetch(`/api/members/${id}/points`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ delta: sign * amount, note }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(body.error === 'balance' ? t.notEnoughPoints : body.error ?? 'error');
      return;
    }
    setNote('');
    setFlash(sign * amount);
    setTimeout(() => setFlash(null), 2200);
    await load();
  }

  const kindLabel = (k: string) =>
    k === 'earn' ? t.keEarn
    : k === 'welcome' ? t.keWelcome
    : k === 'redeem' ? t.keRedeem
    : k === 'refund' ? t.keRefund
    : k === 'expire' ? t.keExpire
    : t.keManual;

  const claimLabel = (s: string) =>
    s === 'pending' ? t.stPending : s === 'approved' ? t.stApproved : s === 'used' ? t.stUsed : t.stRejectedR;

  if (!member) return <><Nav /><main className="p-6 text-ink-3">{t.loading}</main></>;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl p-4 space-y-3">
        <Link href="/members" className="text-ink-3 text-sm">{t.back}</Link>

        <section className="card p-4 rise">
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 shrink-0 rounded-full bg-accent-soft/40 text-accent flex items-center justify-center text-lg">
              {(member.display_name ?? '?').slice(0, 1).toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="serif text-xl truncate">{member.display_name ?? t.lineCustomer}</h1>
              <p className="text-ink-3 text-xs">
                {t.memberSince(dayLabel(dayKey(member.created_at), lang, t))}
                {member.line_user_id ? ' · LINE' : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-ink-3 text-xs">{t.balance}</div>
              <div key={member.points_balance} className="pop serif text-3xl text-gold leading-tight">
                {member.points_balance}
              </div>
            </div>
          </div>

          {nextExpiry?.expires_at && (
            <p className="text-ink-3 text-xs mt-2">
              {t.expiringSoon(nextExpiry.remaining, dayLabel(dayKey(nextExpiry.expires_at), lang, t))}
            </p>
          )}

          {flash !== null && (
            <div className="pop mt-3 rounded-xl bg-veg/10 text-veg text-sm px-3 py-2">
              {flash > 0 ? `+${flash}` : flash} · {t.applyAdjust}
            </div>
          )}
        </section>

        <section className="card p-4 space-y-3">
          <h2 className="serif text-base">{t.adjustPoints}</h2>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value) || 0)}
              className="w-28 rounded-xl border border-rule p-2 text-sm text-center"
              aria-label={t.pointAmount}
            />
            <span className="text-ink-3 text-sm">{t.colPoints}</span>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.pointNote}
            className="w-full rounded-xl border border-rule p-2 text-sm"
          />
          {err && <div className="text-accent text-sm">{err}</div>}
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => adjust(1)} className="btn-primary flex-1 disabled:opacity-50">
              {busy ? '…' : `${t.addPoints} +${Math.abs(delta)}`}
            </button>
            <button disabled={busy} onClick={() => adjust(-1)} className="btn-outline flex-1 border-warn text-warn disabled:opacity-50">
              {t.removePoints} −{Math.abs(delta)}
            </button>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="serif text-base mb-2">{t.pointsHistory}</h2>
          {events.length === 0 ? <p className="text-ink-3 text-sm">{t.nothingYet}</p> : (
            <ul className="divide-y divide-rule stagger">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className={`w-16 shrink-0 font-medium ${e.delta > 0 ? 'text-veg' : 'text-warn'}`}>
                    {e.delta > 0 ? `+${e.delta}` : e.delta}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block">{kindLabel(e.kind)}</span>
                    {e.note && <span className="block text-ink-3 text-xs">{e.note}</span>}
                  </span>
                  {e.order_id && (
                    <Link href={`/orders/${e.order_id}`} className="text-accent text-xs underline shrink-0">
                      {t.orders}
                    </Link>
                  )}
                  <span className="text-ink-3 text-xs w-28 text-right shrink-0">{stamp(e.created_at, lang, t)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="serif text-base mb-2">{t.redemptionHistory}</h2>
          {claims.length === 0 ? <p className="text-ink-3 text-sm">{t.nothingYet}</p> : (
            <ul className="divide-y divide-rule">
              {claims.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="flex-1 min-w-0 truncate">{lang === 'th' ? c.reward_title_th : c.reward_title_en}</span>
                  {c.code && <span className="chip font-mono">{c.code}</span>}
                  <span className="chip">{claimLabel(c.status)}</span>
                  <span className="text-ink-3 text-xs w-14 text-right shrink-0">−{c.points_cost}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="serif text-base mb-2">{t.orderHistory}</h2>
          {orders.length === 0 ? <p className="text-ink-3 text-sm">{t.nothingYet}</p> : (
            <ul className="divide-y divide-rule">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="flex items-center gap-3 py-2 text-sm hover:opacity-70">
                    <span className="text-ink-3 text-xs w-28 shrink-0">{stamp(o.created_at, lang, t)}</span>
                    <span className="flex-1 min-w-0">
                      {o.short_code ?? o.id.slice(0, 6)}
                      <span className="text-ink-3"> · {o.fulfilment_mode === 'pickup' ? t.pickup : t.delivery}</span>
                    </span>
                    <span className="chip text-xs">{statusLabel(t, o.status)}</span>
                    <span className="w-16 text-right font-medium">{baht(o.total_satang)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
