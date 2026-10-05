'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { baht } from '@/lib/money';
import { Nav } from '@/components/Nav';

const TZ = 'Asia/Bangkok';
// Revenue only counts orders the shop actually accepted. 'new' is unverified
// and 'rejected' was never earned, so including either would overstate takings.
const EARNED = ['confirmed', 'ready', 'done'];

type Order = {
  id: string;
  short_code: string | null;
  status: string;
  total_satang: number;
  fulfilment_mode: 'pickup' | 'delivery';
  created_at: string;
};
type Item = { order_id: string; name_snapshot: string; qty: number; line_total_satang: number };

/** Calendar day key in Bangkok time, so a 1am order lands on the right day. */
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
const todayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });

function monthRange(year: number, month: number) {
  // Bangkok is UTC+7 with no DST, so the local month starts 7h before UTC midnight.
  const from = new Date(Date.UTC(year, month, 1, -7, 0, 0));
  const to = new Date(Date.UTC(year, month + 1, 1, -7, 0, 0));
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [recent, setRecent] = useState<Order[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      const sb = supabaseBrowser();
      const { from, to } = monthRange(year, month);

      const res = await sb.from('orders')
        .select('id, short_code, status, total_satang, fulfilment_mode, created_at')
        .gte('created_at', from).lt('created_at', to)
        .order('created_at');
      if (cancelled) return;
      if (res.error) { setError(res.error.message); setLoading(false); return; }
      const rows = (res.data ?? []) as Order[];
      setOrders(rows);

      const ids = rows.filter((o) => EARNED.includes(o.status)).map((o) => o.id);
      if (ids.length) {
        const it = await sb.from('order_items')
          .select('order_id, name_snapshot, qty, line_total_satang')
          .in('order_id', ids);
        if (!cancelled) setItems((it.data ?? []) as Item[]);
      } else if (!cancelled) setItems([]);

      // Separate window so the Today / This week tiles stay true no matter
      // which month is being browsed.
      const since = new Date(Date.now() - 40 * 864e5).toISOString();
      const rec = await sb.from('orders')
        .select('id, short_code, status, total_satang, fulfilment_mode, created_at')
        .gte('created_at', since);
      if (!cancelled) { setRecent((rec.data ?? []) as Order[]); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [year, month]);

  const earned = useMemo(() => orders.filter((o) => EARNED.includes(o.status)), [orders]);

  const byDay = useMemo(() => {
    const m = new Map<string, { count: number; revenue: number }>();
    for (const o of earned) {
      const k = dayKey(o.created_at);
      const cur = m.get(k) ?? { count: 0, revenue: 0 };
      m.set(k, { count: cur.count + 1, revenue: cur.revenue + o.total_satang });
    }
    return m;
  }, [earned]);

  const live = useMemo(() => {
    const earnedRecent = recent.filter((o) => EARNED.includes(o.status));
    const tk = todayKey();
    const d = new Date();
    const weekStart = new Date(d.getTime() - ((d.getDay() + 7) % 7) * 864e5);
    const weekKey = weekStart.toLocaleDateString('en-CA', { timeZone: TZ });
    const monthPrefix = tk.slice(0, 7);
    const sum = (f: (k: string) => boolean) =>
      earnedRecent.filter((o) => f(dayKey(o.created_at))).reduce((n, o) => n + o.total_satang, 0);
    return {
      today: sum((k) => k === tk),
      week: sum((k) => k >= weekKey),
      month: sum((k) => k.startsWith(monthPrefix)),
    };
  }, [recent]);

  const topItems = useMemo(() => {
    const m = new Map<string, { qty: number; revenue: number }>();
    for (const it of items) {
      const cur = m.get(it.name_snapshot) ?? { qty: 0, revenue: 0 };
      m.set(it.name_snapshot, { qty: cur.qty + it.qty, revenue: cur.revenue + it.line_total_satang });
    }
    return [...m.entries()].sort((a, b) => b[1].qty - a[1].qty);
  }, [items]);

  const revenue = earned.reduce((n, o) => n + o.total_satang, 0);
  const avg = earned.length ? Math.round(revenue / earned.length) : 0;
  const delivery = earned.filter((o) => o.fulfilment_mode === 'delivery').length;

  const first = new Date(Date.UTC(year, month, 1));
  const pad = first.getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const label = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  function shift(by: number) {
    const d = new Date(Date.UTC(year, month + by, 1));
    setYear(d.getUTCFullYear()); setMonth(d.getUTCMonth()); setSelected(null);
  }

  const dayOrders = selected ? orders.filter((o) => dayKey(o.created_at) === selected) : [];

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Tile label="Today" value={baht(live.today)} />
          <Tile label="This week" value={baht(live.week)} />
          <Tile label="This month" value={baht(live.month)} />
        </div>

        <section className="card p-4">
          <div className="flex items-center justify-between">
            <button onClick={() => shift(-1)} className="btn-outline px-3 py-1">‹</button>
            <h1 className="serif text-lg">{label}</h1>
            <button onClick={() => shift(1)} className="btn-outline px-3 py-1">›</button>
          </div>

          {error && <div className="text-accent text-sm mt-3">{error}</div>}
          {loading && <p className="text-ink-3 text-sm text-center py-8">Loading…</p>}

          {!loading && (
            <>
              <div className="grid grid-cols-7 gap-1 mt-4 text-center text-ink-3 text-xs">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 mt-1">
                {Array.from({ length: pad }).map((_, i) => <div key={`p${i}`} />)}
                {Array.from({ length: days }).map((_, i) => {
                  const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                  const d = byDay.get(key);
                  const isToday = key === todayKey();
                  return (
                    <button
                      key={key}
                      onClick={() => setSelected(selected === key ? null : key)}
                      className={`rounded-lg border p-1.5 text-left min-h-[58px] transition ${
                        selected === key ? 'border-accent bg-accent-soft/30'
                          : d ? 'border-rule bg-white hover:border-accent'
                          : 'border-rule/60 bg-surface-2'
                      }`}
                    >
                      <div className={`text-xs ${isToday ? 'font-semibold text-accent' : 'text-ink-3'}`}>{i + 1}</div>
                      {d && (
                        <>
                          <div className="text-[11px] font-medium leading-tight mt-0.5">{baht(d.revenue)}</div>
                          <div className="text-[10px] text-ink-3">{d.count} order{d.count > 1 ? 's' : ''}</div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-rule">
                <Tile label="Orders" value={String(earned.length)} small />
                <Tile label="Revenue" value={baht(revenue)} small />
                <Tile label="Average order" value={baht(avg)} small />
                <Tile label="Delivery / pickup" value={`${delivery} / ${earned.length - delivery}`} small />
              </div>
              <p className="text-ink-3 text-xs mt-2">
                Counts accepted orders only. Orders still waiting to be confirmed, and rejected ones, are left out.
              </p>
            </>
          )}
        </section>

        {selected && (
          <section className="card p-4">
            <h2 className="serif text-base mb-2">
              {new Date(`${selected}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            {dayOrders.length === 0 ? (
              <p className="text-ink-3 text-sm">No orders that day.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {dayOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/orders/${o.id}`} className="flex items-center gap-3 py-2 hover:opacity-70">
                      <span className="text-ink-3 text-xs w-12 shrink-0">
                        {new Date(o.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ })}
                      </span>
                      <span className="flex-1 text-sm">
                        {o.short_code ?? o.id.slice(0, 6)}
                        <span className="text-ink-3"> · {o.fulfilment_mode}</span>
                      </span>
                      <span className="chip text-xs">{o.status}</span>
                      <span className="text-sm font-medium w-16 text-right">{baht(o.total_satang)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="card p-4">
          <h2 className="serif text-base mb-2">What sold in {label}</h2>
          {topItems.length === 0 ? (
            <p className="text-ink-3 text-sm">Nothing sold yet this month.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {topItems.map(([name, v]) => (
                <li key={name} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-10 shrink-0 text-ink-3">{v.qty}×</span>
                  <span className="flex-1">{name}</span>
                  <span className="font-medium">{baht(v.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function Tile({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className={small ? '' : 'card p-3'}>
      <div className="text-ink-3 text-xs">{label}</div>
      <div className={`${small ? 'text-base' : 'serif text-xl'} font-medium mt-0.5`}>{value}</div>
    </div>
  );
}
