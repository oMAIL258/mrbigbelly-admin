'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Nav } from '@/components/Nav';

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

  useEffect(() => {
    (async () => {
      const { data, error } = await supabaseBrowser().from('store_settings').select('*').limit(1).single();
      if (error) setErr(error.message);
      if (data) setS(data as Settings);
    })();
  }, []);

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

        {msg && <div className="text-sm text-ink-3">{msg}</div>}
        {err && <div className="text-sm text-accent">{err}</div>}
      </main>
    </>
  );
}
