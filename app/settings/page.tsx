'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Nav } from '@/components/Nav';

type Health = {
  tokenOk: boolean;
  detail: string;
  liffId: string | null;
  bot: { displayName: string; basicId: string } | null;
  recent: { total: number; withLine: number };
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
    if (error) setErr(error.message); else setMsg('Saved.');
  }

  if (err && !s) return <><Nav /><main className="p-6 text-accent text-sm">{err}</main></>;
  if (!s) return <><Nav /><main className="p-6 text-ink-3">Loading…</main></>;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-xl p-4 space-y-4">
        <h1 className="serif text-xl">Settings</h1>

        <section className={`card p-4 ${s.accepting_orders ? '' : 'border-accent'}`}>
          <h2 className="serif text-base">Taking orders</h2>
          <p className="text-ink-3 text-sm mt-1">
            Switch this off for a holiday or when you close early. Customers still see the menu, but
            cannot place an order until you switch it back on.
          </p>
          <button
            onClick={() => save({ accepting_orders: !s.accepting_orders })}
            disabled={saving}
            className={`mt-3 ${s.accepting_orders ? 'btn-outline' : 'btn-primary'}`}
          >
            {s.accepting_orders ? 'Open — tap to close the shop' : 'Closed — tap to reopen'}
          </button>

          {!s.accepting_orders && (
            <div className="mt-3">
              <label className="text-sm text-ink-2">Message customers see</label>
              <input
                value={s.closed_message ?? ''}
                onChange={(e) => setS({ ...s, closed_message: e.target.value })}
                onBlur={() => save()}
                placeholder="Closed for Songkran — back on 16 April"
                className="mt-1 w-full rounded-xl border border-rule p-2 text-sm"
              />
            </div>
          )}
        </section>

        <section className="card p-4 space-y-3">
          <h2 className="serif text-base">Hours and timing</h2>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              Open
              <input type="time" value={s.open_time.slice(0, 5)} onChange={(e) => setS({ ...s, open_time: e.target.value + ':00' })}
                className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
            </label>
            <label className="text-sm">
              Close
              <input type="time" value={s.close_time.slice(0, 5)} onChange={(e) => setS({ ...s, close_time: e.target.value + ':00' })}
                className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
            </label>
          </div>
          <label className="text-sm block">
            Default prep time (minutes)
            <input type="number" value={s.default_prep_minutes}
              onChange={(e) => setS({ ...s, default_prep_minutes: Number(e.target.value) || 15 })}
              className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
          </label>
          <button onClick={() => save()} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </section>

        <section className="card p-4">
          <h2 className="serif text-base">Who gets told about new orders</h2>
          <p className="text-ink-3 text-sm mt-1">
            Anyone ticked here gets a LINE message the moment an order comes in, so you still
            hear about it with the order board closed. Tick your own name. Names appear here
            once someone has ordered through LINE.
          </p>
          {contacts.length === 0 ? (
            <p className="text-ink-3 text-sm mt-3">
              Nobody has ordered through LINE yet, so there is nobody to pick.
            </p>
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
                    {c.display_name ?? 'LINE customer'}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`card p-4 ${health && !health.tokenOk ? 'border-accent' : ''}`}>
          <div className="flex items-baseline justify-between">
            <h2 className="serif text-base">LINE messages</h2>
            <button onClick={checkLine} disabled={checking} className="text-ink-3 text-xs underline">
              {checking ? 'Checking…' : 'Check again'}
            </button>
          </div>

          {checking && !health && <p className="text-ink-3 text-sm mt-2">Checking…</p>}

          {health && (
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex gap-2">
                <span className={health.tokenOk ? 'text-veg' : 'text-accent'}>{health.tokenOk ? '✓' : '✕'}</span>
                <span>{health.detail}</span>
              </div>
              <div className="flex gap-2">
                <span className={health.liffId ? 'text-veg' : 'text-accent'}>{health.liffId ? '✓' : '✕'}</span>
                <span>
                  {health.liffId
                    ? <>Order links point at LIFF app <code className="text-xs">{health.liffId}</code>.</>
                    : 'LINE_LIFF_ID is not set, so messages go out without a link back to the order.'}
                </span>
              </div>
              <div className="flex gap-2">
                <span className={health.recent.withLine ? 'text-veg' : 'text-accent'}>
                  {health.recent.withLine ? '✓' : '✕'}
                </span>
                <span>
                  {health.recent.withLine} of the last {health.recent.total} orders have a LINE contact.
                  {health.recent.withLine === 0 && health.recent.total > 0 &&
                    ' Nobody can be messaged until customers order from inside LINE.'}
                </span>
              </div>
            </div>
          )}

          {!health && !checking && (
            <p className="text-ink-3 text-sm mt-2">The check could not run. Try again in a moment.</p>
          )}
        </section>

        {msg && <div className="text-sm text-ink-3">{msg}</div>}
        {err && <div className="text-sm text-accent">{err}</div>}
      </main>
    </>
  );
}
