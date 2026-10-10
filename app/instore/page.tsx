'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { baht } from '@/lib/money';
import { Nav } from '@/components/Nav';
import { useLang } from '@/lib/i18n';
import { looksLikeThaiPhone, normalisePhone, prettyPhone } from '@/lib/phone';

type Found = { id: string; display_name: string | null; phone: string | null; points_balance: number };
type Saved = { points: number; welcome: number; total: number; balance: number; push: boolean };

/** Baht typed into a box, as satang, without a floating-point surprise. */
function satangOf(text: string): number {
  const n = Number(text.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export default function InStorePage() {
  const { t } = useLang();
  const [stage, setStage] = useState<'find' | 'amount' | 'done'>('find');
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState<Found | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [per, setPer] = useState(10000);
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);

  const phoneBox = useRef<HTMLInputElement>(null);
  const amountBox = useRef<HTMLInputElement>(null);

  // The rate is what turns a bill into points, and the counter should see the
  // same figure the customer will be told.
  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser()
        .from('loyalty_settings')
        .select('satang_per_point, points_enabled')
        .limit(1).maybeSingle();
      if (data) { setPer(data.satang_per_point ?? 10000); setEnabled(data.points_enabled ?? true); }
    })();
  }, []);

  useEffect(() => {
    if (stage === 'find') phoneBox.current?.focus();
    if (stage === 'amount') amountBox.current?.focus();
  }, [stage]);

  async function find(e: React.FormEvent) {
    e.preventDefault();
    if (!looksLikeThaiPhone(phone)) { setErr(t.badPhone); return; }
    setBusy(true); setErr(null);
    const sb = supabaseBrowser();
    const { data } = await sb.rpc('customer_by_phone', { p_phone: normalisePhone(phone) });
    const hit = ((data ?? []) as Found[])[0];
    if (!hit) { setBusy(false); setMember(null); setErr(t.noSuchPhone); return; }

    // Points run out on a date rather than on an action, so the figure read
    // out at the counter is settled before it is shown.
    await sb.rpc('expire_points', { p_customer: hit.id });
    const { data: fresh } = await sb.from('customers')
      .select('points_balance').eq('id', hit.id).maybeSingle();
    setBusy(false);

    setMember({ ...hit, points_balance: fresh?.points_balance ?? hit.points_balance });
    setStage('amount');
  }

  async function save(again = false) {
    const satang = satangOf(amount);
    if (!member || satang <= 0) return;
    setBusy(true); setErr(null);
    const res = await fetch('/api/instore', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customer_id: member.id, amount_satang: satang, note, again }),
    });
    const body = (await res.json().catch(() => ({}))) as Saved & { error?: string };
    setBusy(false);

    if (res.status === 409 && body.error === 'repeat') {
      // The same amount for the same person, moments ago. Almost always a
      // double tap, occasionally a second helping.
      if (window.confirm(t.repeatWarn(baht(satang)))) await save(true);
      return;
    }
    if (!res.ok) { setErr(body.error ?? 'error'); return; }

    setSaved(body);
    setStage('done');
  }

  function reset() {
    setStage('find'); setPhone(''); setMember(null);
    setAmount(''); setNote(''); setSaved(null); setErr(null);
  }

  const satang = satangOf(amount);
  const willEarn = enabled ? Math.floor(satang / per) : 0;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-md p-4 space-y-3">
        <div>
          <h1 className="serif text-xl">{t.inStoreTitle}</h1>
          <p className="text-ink-3 text-sm mt-1">{t.inStoreIntro}</p>
        </div>

        {!enabled && (
          <div className="rounded-xl bg-warn/10 text-warn text-sm px-3 py-2">{t.pointsOffNote}</div>
        )}

        {stage === 'find' && (
          <form onSubmit={find} className="card p-4 space-y-3">
            <label className="block">
              <span className="text-ink-3 text-xs">{t.phoneLabel}</span>
              <input
                ref={phoneBox}
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setErr(null); }}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder={t.phonePlaceholder}
                className="mt-1 w-full rounded-xl border border-rule p-3 text-lg tracking-wide text-center"
              />
            </label>
            {err && (
              <div className="text-accent text-sm">
                {err}
                {err === t.noSuchPhone && <span className="block text-ink-3 mt-1">{t.noSuchPhoneHelp}</span>}
              </div>
            )}
            <button disabled={busy} className="btn-primary w-full disabled:opacity-50">
              {busy ? t.searching : t.findMember}
            </button>
          </form>
        )}

        {stage !== 'find' && member && (
          <section className="card p-4 flex items-center gap-3">
            <span className="h-10 w-10 shrink-0 rounded-full bg-accent-soft/40 text-accent flex items-center justify-center">
              {(member.display_name ?? '?').slice(0, 1).toUpperCase()}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block truncate">{member.display_name ?? t.lineCustomer}</span>
              <span className="block text-ink-3 text-xs">{prettyPhone(member.phone)}</span>
            </span>
            <span className="text-right">
              <span className="block text-ink-3 text-[11px]">{t.colPoints}</span>
              <span className="block serif text-xl text-gold leading-tight">
                {saved ? saved.balance : member.points_balance}
              </span>
            </span>
          </section>
        )}

        {stage === 'amount' && (
          <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="card p-4 space-y-3">
            <label className="block">
              <span className="text-ink-3 text-xs">{t.amountLabel}</span>
              <input
                ref={amountBox}
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setErr(null); }}
                type="text"
                inputMode="decimal"
                placeholder="500"
                className="mt-1 w-full rounded-xl border border-rule p-3 serif text-2xl text-center"
              />
            </label>

            {satang > 0 && (
              <div className={`rounded-xl px-3 py-2 text-sm text-center ${willEarn > 0 ? 'bg-veg/10 text-veg' : 'bg-surface-2 text-ink-3'}`}>
                {willEarn > 0 ? t.willEarn(willEarn) : t.willEarnNone}
              </div>
            )}

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.visitNote}
              className="w-full rounded-xl border border-rule p-2 text-sm"
            />

            {err && <div className="text-accent text-sm">{err}</div>}

            <div className="flex gap-2">
              <button type="button" onClick={reset} className="btn-outline shrink-0">{t.back}</button>
              <button disabled={busy || satang <= 0} className="btn-primary flex-1 disabled:opacity-50">
                {busy ? '…' : t.saveVisit}
              </button>
            </div>
          </form>
        )}

        {stage === 'done' && saved && member && (
          <section className="card p-4 space-y-3 rise">
            <div className="text-center">
              <div className="text-3xl">⭐</div>
              <h2 className="serif text-lg mt-1">{t.visitSavedTitle}</h2>
              <p className="serif text-3xl text-veg mt-2">
                {saved.points > 0 ? `+${saved.points}` : baht(satangOf(amount))}
              </p>
              <p className="text-ink-2 text-sm mt-1">
                {saved.points > 0 ? t.visitGave(saved.points) : t.visitGaveNone}
              </p>
              {saved.welcome > 0 && (
                <p className="text-ink-3 text-xs mt-0.5">{t.welcomeAlso(saved.welcome)}</p>
              )}
              <p className="text-ink-3 text-xs mt-1">{t.newBalance(saved.balance)}</p>
              <p className="text-ink-3 text-xs mt-1">{saved.push ? t.toldCustomer : t.notToldCustomer}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/members/${member.id}`} className="btn-outline flex-1 text-center">{t.openMember}</Link>
              <button onClick={reset} className="btn-primary flex-1">{t.recordAnother}</button>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
