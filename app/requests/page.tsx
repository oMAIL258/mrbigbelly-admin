'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Nav } from '@/components/Nav';
import { useLang, type Lang } from '@/lib/i18n';
import { shopTime, dayKey, dayLabel } from '@/lib/day';

type Claim = {
  id: string;
  code: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'used';
  points_cost: number;
  reward_title_th: string;
  reward_title_en: string;
  reject_reason: string | null;
  created_at: string;
  decided_at: string | null;
  customer_id: string;
  customers: { display_name: string | null } | { display_name: string | null }[] | null;
};

const who = (c: Claim['customers']) => (Array.isArray(c) ? c[0] : c)?.display_name ?? null;
const stamp = (iso: string, lang: Lang, words: { today: string; yesterday: string }) =>
  `${dayLabel(dayKey(iso), lang, words)} ${shopTime(iso)}`;

export default function RequestsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { lang, t } = useLang();

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser()
      .from('redemptions')
      .select('*, customers(display_name)')
      .order('created_at', { ascending: false })
      .limit(200);
    setClaims((data ?? []) as unknown as Claim[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // The queue moves while staff are looking at it, so it follows the table.
  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb.channel('requests-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'redemptions' }, () => { void load(); })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [load]);

  async function decide(c: Claim, decision: 'approved' | 'rejected') {
    setBusy(c.id); setErr(null);
    const res = await fetch(`/api/redemptions/${c.id}/decide`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision, reason: reason[c.id] ?? '' }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(body.error === 'decided' ? t.alreadyDecided
        : body.error === 'out of stock' ? t.outOfStock
        : body.error ?? 'error');
      await load();
      return;
    }
    const body = (await res.json()) as { code: string | null };
    setDone(decision === 'approved' ? `${t.stApproved} · ${t.code} ${body.code ?? ''}` : t.refundedPoints(c.points_cost));
    setTimeout(() => setDone(null), 3000);
    await load();
  }

  async function markUsed(c: Claim) {
    setBusy(c.id);
    await fetch(`/api/redemptions/${c.id}/use`, { method: 'POST' });
    setBusy(null);
    await load();
  }

  const label = (s: Claim['status']) =>
    s === 'pending' ? t.stPending : s === 'approved' ? t.stApproved : s === 'used' ? t.stUsed : t.stRejectedR;

  const pending = claims.filter((c) => c.status === 'pending');
  const rest = claims.filter((c) => c.status !== 'pending');
  const shown = tab === 'pending' ? pending : rest;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl p-4 space-y-3">
        <h1 className="serif text-xl">{t.requests}</h1>

        <div className="flex gap-2">
          {(['pending', 'history'] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-full px-3 py-1.5 text-sm ${tab === k ? 'bg-accent text-white' : 'btn-outline'}`}>
              {k === 'pending' ? t.pendingTab : t.historyTab}
              {k === 'pending' && pending.length > 0 && ` (${pending.length})`}
            </button>
          ))}
        </div>

        {done && <div className="pop card border-veg bg-veg/5 text-veg p-3 text-sm">{done}</div>}
        {err && <div className="card border-accent p-3 text-sm text-accent">{err}</div>}

        {loading && <p className="text-ink-3 text-sm text-center py-10">{t.loading}</p>}
        {!loading && shown.length === 0 && (
          <p className="text-ink-3 text-sm text-center py-10">
            {tab === 'pending' ? t.noPending : t.noRequests}
          </p>
        )}

        <ul className="space-y-2 stagger">
          {shown.map((c) => (
            <li key={c.id} className={`card p-3 ${c.status === 'pending' ? 'border-gold' : ''}`}>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="serif text-base flex-1 min-w-0 truncate">
                  {lang === 'th' ? c.reward_title_th : c.reward_title_en}
                </span>
                <span className="chip">{label(c.status)}</span>
                <span className="text-gold text-sm font-medium">−{c.points_cost}</span>
              </div>

              <div className="text-ink-3 text-xs mt-1 flex gap-2 flex-wrap">
                <Link href={`/members/${c.customer_id}`} className="underline">
                  {who(c.customers) ?? t.lineCustomer}
                </Link>
                <span>{stamp(c.created_at, lang, t)}</span>
                {c.code && <span className="font-mono">{t.code} {c.code}</span>}
                {c.reject_reason && <span>· {c.reject_reason}</span>}
              </div>

              {c.status === 'pending' && (
                <div className="mt-3 space-y-2">
                  <input
                    value={reason[c.id] ?? ''}
                    onChange={(e) => setReason({ ...reason, [c.id]: e.target.value })}
                    placeholder={t.reasonOptional}
                    className="w-full rounded-xl border border-rule p-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button disabled={busy === c.id} onClick={() => decide(c, 'approved')}
                      className="btn-primary flex-1 bg-veg disabled:opacity-50">
                      {busy === c.id ? '…' : `✓ ${t.approve}`}
                    </button>
                    <button disabled={busy === c.id} onClick={() => decide(c, 'rejected')}
                      className="btn-outline flex-1 border-warn text-warn disabled:opacity-50">
                      {t.rejectRequest}
                    </button>
                  </div>
                </div>
              )}

              {c.status === 'approved' && (
                <button disabled={busy === c.id} onClick={() => markUsed(c)} className="btn-outline mt-3 w-full">
                  {t.markUsed}
                </button>
              )}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
