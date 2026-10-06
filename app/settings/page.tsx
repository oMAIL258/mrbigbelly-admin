'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Nav } from '@/components/Nav';
import { useLang } from '@/lib/i18n';

type TokenState =
  | { code: 'missing' }
  | { code: 'ok'; name: string }
  | { code: 'rejected'; status: number; body: string }
  | { code: 'unreachable'; message: string };

type Health = {
  tokenOk: boolean;
  token: TokenState;
  liffId: string | null;
  bot: { displayName: string; basicId: string } | null;
  recent: { total: number; withLine: number };
  customer: { reachable: boolean; lineToken: boolean };
};

type Contact = { line_user_id: string; display_name: string | null };

type Settings = {
  id: string;
  open_time: string;
  close_time: string;
  default_prep_minutes: number;
  accepting_orders: boolean;
  closed_message: string | null;
};

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [checking, setChecking] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [alerted, setAlerted] = useState<Set<string>>(new Set());
  const { t } = useLang();

  const tokenText = (state: TokenState) =>
    state.code === 'ok' ? t.botConnected(state.name)
    : state.code === 'missing' ? t.tokenMissing
    : state.code === 'rejected' ? t.tokenRejected(state.status, state.body)
    : t.lineUnreachable(state.message);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabaseBrowser().from('store_settings').select('*').limit(1).single();
      if (error) setErr(error.message);
      if (data) setS(data as Settings);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const [c, a] = await Promise.all([
        sb.from('customers').select('line_user_id, display_name')
          .not('line_user_id', 'is', null).order('created_at', { ascending: false }).limit(50),
        sb.from('staff_alerts').select('line_user_id'),
      ]);
      setContacts((c.data ?? []) as Contact[]);
      setAlerted(new Set(((a.data ?? []) as { line_user_id: string }[]).map((r) => r.line_user_id)));
    })();
  }, []);

  async function toggleAlert(c: Contact, on: boolean) {
    const sb = supabaseBrowser();
    setAlerted((cur) => {
      const next = new Set(cur);
      if (on) next.add(c.line_user_id); else next.delete(c.line_user_id);
      return next;
    });
    if (on) {
      await sb.from('staff_alerts').upsert({ line_user_id: c.line_user_id, display_name: c.display_name });
    } else {
      await sb.from('staff_alerts').delete().eq('line_user_id', c.line_user_id);
    }
  }

  async function checkLine() {
    setChecking(true);
    try {
      const res = await fetch('/api/line/health', { cache: 'no-store' });
      setHealth(res.ok ? await res.json() : null);
    } catch { setHealth(null); }
    setChecking(false);
  }
  useEffect(() => { checkLine(); }, []);

  async function save(patch?: Partial<Settings>) {
    if (!s) return;
    const next = { ...s, ...patch };
    setS(next);
    setSaving(true); setMsg(null); setErr(null);
    const { error } = await supabaseBrowser().from('store_settings').update({
      open_time: next.open_time, close_time: next.close_time,
      default_prep_minutes: next.default_prep_minutes,
      accepting_orders: next.accepting_orders,
      closed_message: next.closed_message,
    }).eq('id', next.id);
    setSaving(false);
    if (error) setErr(error.message); else setMsg(t.saved);
  }

  if (err && !s) return <><Nav /><main className="p-6 text-accent text-sm">{err}</main></>;
  if (!s) return <><Nav /><main className="p-6 text-ink-3">{t.loading}</main></>;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-xl p-4 space-y-4">
        <h1 className="serif text-xl">{t.settings}</h1>

        <section className={`card p-4 ${s.accepting_orders ? '' : 'border-accent'}`}>
          <h2 className="serif text-base">{t.takingOrders}</h2>
          <p className="text-ink-3 text-sm mt-1">{t.takingOrdersNote}</p>
          <button
            onClick={() => save({ accepting_orders: !s.accepting_orders })}
            disabled={saving}
            className={`mt-3 ${s.accepting_orders ? 'btn-outline' : 'btn-primary'}`}
          >
            {s.accepting_orders ? t.openTapToClose : t.closedTapToOpen}
          </button>

          {!s.accepting_orders && (
            <div className="mt-3">
              <label className="text-sm text-ink-2">{t.closedMessageLabel}</label>
              <input
                value={s.closed_message ?? ''}
                onChange={(e) => setS({ ...s, closed_message: e.target.value })}
                onBlur={() => save()}
                placeholder={t.closedMessageHint}
                className="mt-1 w-full rounded-xl border border-rule p-2 text-sm"
              />
            </div>
          )}
        </section>

        <section className="card p-4 space-y-3">
          <h2 className="serif text-base">{t.hours}</h2>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              {t.openTime}
              <input type="time" value={s.open_time.slice(0, 5)} onChange={(e) => setS({ ...s, open_time: e.target.value + ':00' })}
                className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
            </label>
            <label className="text-sm">
              {t.closeTime}
              <input type="time" value={s.close_time.slice(0, 5)} onChange={(e) => setS({ ...s, close_time: e.target.value + ':00' })}
                className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
            </label>
          </div>
          <label className="text-sm block">
            {t.defaultPrep}
            <input type="number" value={s.default_prep_minutes}
              onChange={(e) => setS({ ...s, default_prep_minutes: Number(e.target.value) || 15 })}
              className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
          </label>
          <button onClick={() => save()} disabled={saving} className="btn-primary">
            {saving ? t.saving : t.save}
          </button>
        </section>

        <section className="card p-4">
          <h2 className="serif text-base">{t.whoGetsTold}</h2>
          <p className="text-ink-3 text-sm mt-1">{t.whoGetsToldNote}</p>
          {contacts.length === 0 ? (
            <p className="text-ink-3 text-sm mt-3">{t.nobodyYet}</p>
          ) : (
            <ul className="mt-3 divide-y divide-rule">
              {contacts.map((c) => (
                <li key={c.line_user_id} className="flex items-center gap-3 py-2">
                  <input
                    id={c.line_user_id}
                    type="checkbox"
                    checked={alerted.has(c.line_user_id)}
                    onChange={(e) => toggleAlert(c, e.target.checked)}
                    className="h-4 w-4 accent-accent"
                  />
                  <label htmlFor={c.line_user_id} className="text-sm flex-1 cursor-pointer">
                    {c.display_name ?? t.lineCustomer}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`card p-4 ${health && !health.tokenOk ? 'border-accent' : ''}`}>
          <div className="flex items-baseline justify-between">
            <h2 className="serif text-base">{t.lineMessages}</h2>
            <button onClick={checkLine} disabled={checking} className="text-ink-3 text-xs underline">
              {checking ? t.checking : t.checkAgain}
            </button>
          </div>

          {checking && !health && <p className="text-ink-3 text-sm mt-2">{t.checking}</p>}

          {health && (
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex gap-2">
                <span className={health.tokenOk ? 'text-veg' : 'text-accent'}>{health.tokenOk ? '✓' : '✕'}</span>
                <span>{tokenText(health.token)}</span>
              </div>
              <div className="flex gap-2">
                <span className={health.liffId ? 'text-veg' : 'text-accent'}>{health.liffId ? '✓' : '✕'}</span>
                <span>
                  {health.liffId ? t.liffSet(health.liffId) : t.liffMissing}
                </span>
              </div>
              <div className="flex gap-2">
                <span className={health.customer?.lineToken ? 'text-veg' : 'text-accent'}>
                  {health.customer?.lineToken ? '✓' : '✕'}
                </span>
                <span>
                  {health.customer?.lineToken
                    ? t.alertsOn
                    : health.customer?.reachable ? t.alertsNoToken : t.alertsUnreachable}
                </span>
              </div>
              <div className="flex gap-2">
                <span className={health.recent.withLine ? 'text-veg' : 'text-accent'}>
                  {health.recent.withLine ? '✓' : '✕'}
                </span>
                <span>
                  {t.withLine(health.recent.withLine, health.recent.total)}
                  {health.recent.withLine === 0 && health.recent.total > 0 && t.noneWithLine}
                </span>
              </div>
            </div>
          )}

          {!health && !checking && (
            <p className="text-ink-3 text-sm mt-2">{t.checkFailed}</p>
          )}
        </section>

        {msg && <div className="text-sm text-ink-3">{msg}</div>}
        {err && <div className="text-sm text-accent">{err}</div>}
      </main>
    </>
  );
}
