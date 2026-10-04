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
};

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser().from('store_settings').select('*').limit(1).single();
      if (data) setS(data as Settings);
    })();
  }, []);

  async function save() {
    if (!s) return;
    setSaving(true); setMsg(null);
    const { error } = await supabaseBrowser().from('store_settings').update({
      open_time: s.open_time, close_time: s.close_time,
      default_prep_minutes: s.default_prep_minutes, accepting_orders: s.accepting_orders,
    }).eq('id', s.id);
    setSaving(false);
    setMsg(error ? error.message : 'Saved.');
  }

  if (!s) return <><Nav /><main className="p-6 text-ink-3">Loading…</main></>;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-xl p-4">
        <h1 className="serif text-xl mb-3">Settings</h1>
        <div className="card p-4 space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">Accepting orders</span>
            <input type="checkbox" checked={s.accepting_orders} onChange={(e) => setS({ ...s, accepting_orders: e.target.checked })} />
          </label>
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
            <input type="number" value={s.default_prep_minutes} onChange={(e) => setS({ ...s, default_prep_minutes: Number(e.target.value) || 15 })}
              className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
          </label>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save'}
          </button>
          {msg && <div className="text-sm text-ink-3">{msg}</div>}
        </div>
      </main>
    </>
  );
}
