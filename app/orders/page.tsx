'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { baht } from '@/lib/money';
import { Nav } from '@/components/Nav';
import { alarm, unlockAudio, askNotifyPermission, notify } from '@/lib/alarm';
import { dayKey, todayKey, dayBounds, shiftDay, dayLabel, shopTime } from '@/lib/day';
import { useLang } from '@/lib/i18n';

type Order = {
  id: string;
  short_code: string | null;
  status: 'new' | 'confirmed' | 'ready' | 'done' | 'rejected';
  total_satang: number;
  fulfilment_mode: 'pickup' | 'delivery';
  contact_name: string | null;
  prep_minutes: number | null;
  created_at: string;
};

const SELECT = 'id, short_code, status, total_satang, fulfilment_mode, contact_name, prep_minutes, created_at';

export default function OrderBoardPage() {
  const [day, setDay] = useState(todayKey());
  const [orders, setOrders] = useState<Order[]>([]);
  const [stale, setStale] = useState<{ count: number; oldest: string } | null>(null);
  const [bellOn, setBellOn] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { lang, t } = useLang();

  const isToday = day === todayKey();
  const label = (key: string) => dayLabel(key, lang, t);
  const cols: { key: Order['status']; label: string }[] = [
    { key: 'new', label: t.stNew },
    { key: 'confirmed', label: t.stConfirmed },
    { key: 'ready', label: t.stReady },
    { key: 'done', label: t.stDone },
  ];

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const { from, to } = dayBounds(day);
    const { data, error } = await sb.from('orders').select(SELECT)
      .gte('created_at', from).lt('created_at', to)
      .in('status', ['new', 'confirmed', 'ready', 'done'])
      .order('created_at', { ascending: false });
    if (error) { setLoadError(error.message); return; }
    setLoadError(null);
    setOrders((data ?? []) as Order[]);
  }, [day]);

  useEffect(() => { void load(); }, [load]);

  // An order left unfinished on an earlier day would simply vanish from a
  // board that only shows today, so count those and offer a way to them.
  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser().from('orders')
        .select('created_at')
        .in('status', ['new', 'confirmed', 'ready'])
        .lt('created_at', dayBounds(todayKey()).from)
        .order('created_at');
      const rows = (data ?? []) as { created_at: string }[];
      setStale(rows.length ? { count: rows.length, oldest: dayKey(rows[0].created_at) } : null);
    })();
  }, [orders]);

  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb.channel('orders-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const row = payload.new as Order;
        // Only touch the day being looked at, so a fresh order cannot appear
        // inside yesterday's board.
        if (!row?.created_at || dayKey(row.created_at) !== day) return;
        if (payload.eventType === 'INSERT') {
          notify(t.newOrder, `${row.short_code ?? ''} · ${row.fulfilment_mode === 'pickup' ? t.pickup : t.delivery}`.trim());
          setOrders((cur) => [row, ...cur]);
          return;
        }
        if (payload.eventType === 'UPDATE') {
          setOrders((cur) => cur.some((o) => o.id === row.id)
            ? cur.map((o) => (o.id === row.id ? row : o))
            : [row, ...cur]);
        }
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [day, t]);

  const newCount = orders.filter((o) => o.status === 'new').length;

  // Only today's unaccepted orders sound. A board left on an old date must not
  // sit there chiming at orders that were dealt with days ago.
  useEffect(() => {
    if (!bellOn || !isToday || newCount === 0) return;
    alarm();
    const timer = setInterval(alarm, 8000);
    return () => clearInterval(timer);
  }, [bellOn, isToday, newCount]);

  useEffect(() => {
    if (newCount === 0 || !isToday) { document.title = 'Mr. Big Belly · Admin'; return; }
    let on = false;
    const flash = () => {
      on = !on;
      document.title = on ? t.newOrderCount(newCount) : 'Mr. Big Belly · Admin';
    };
    flash();
    const timer = setInterval(flash, 900);
    return () => { clearInterval(timer); document.title = 'Mr. Big Belly · Admin'; };
  }, [newCount, isToday, t]);

  useEffect(() => {
    const unlock = () => { unlockAudio(); void askNotifyPermission(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl p-4">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h1 className="serif text-xl">
            {t.orderBoard}
            {isToday && newCount > 0 && (
              <span className="ml-2 rounded-full bg-accent text-white text-sm px-2 py-0.5 align-middle">
                {t.waitingCount(newCount)}
              </span>
            )}
          </h1>
          <div className="flex gap-2">
            <button onClick={() => { unlockAudio(); void askNotifyPermission(); alarm(); }} className="btn-outline">
              {t.testAlarm}
            </button>
            <button onClick={() => { unlockAudio(); setBellOn((v) => !v); }} className="btn-outline">
              {bellOn ? t.soundOn : t.soundOff}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mb-3">
          <button onClick={() => setDay((d) => shiftDay(d, -1))} className="btn-outline px-3 py-1">‹</button>
          <span className="serif text-base w-44 text-center">{label(day)}</span>
          <button
            onClick={() => setDay((d) => shiftDay(d, 1))}
            disabled={isToday}
            className="btn-outline px-3 py-1 disabled:opacity-30"
          >
            ›
          </button>
          {!isToday && (
            <button onClick={() => setDay(todayKey())} className="text-accent text-sm underline">
              {t.backToToday}
            </button>
          )}
        </div>

        {stale && isToday && (
          <button
            onClick={() => setDay(stale.oldest)}
            className="card border-accent p-3 mb-3 w-full text-left text-sm hover:opacity-80"
          >
            <strong className="text-accent">{t.staleOpen(stale.count)}</strong>
            <span className="text-ink-2">{t.staleGo(label(stale.oldest))}</span>
          </button>
        )}

        {loadError && (
          <div className="card border-accent p-3 mb-3 text-sm">
            <strong className="text-accent">{t.loadFailed}</strong>
            <div className="text-ink-2 mt-1">{loadError}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {cols.map((c) => {
            const col = orders.filter((o) => o.status === c.key);
            return (
              <div key={c.key} className="rounded-2xl bg-surface-2 p-2 min-h-[200px]">
                <div className="px-2 py-1 flex justify-between items-baseline">
                  <h2 className="serif text-base">{c.label}</h2>
                  <span className="text-ink-3 text-xs">{col.length}</span>
                </div>
                <ul className="space-y-2">
                  {col.map((o) => (
                    <li key={o.id}>
                      <Link href={`/orders/${o.id}`} className="card block p-3 hover:border-ink-3">
                        <div className="flex justify-between items-baseline">
                          <span className="serif text-sm">#{o.short_code ?? o.id.slice(0, 6)}</span>
                          <span className="text-xs text-ink-3">{shopTime(o.created_at)}</span>
                        </div>
                        {o.contact_name && (
                          <div className="text-sm mt-0.5 truncate">{o.contact_name}</div>
                        )}
                        <div className="text-sm mt-1 flex justify-between">
                          <span>{o.fulfilment_mode === 'pickup' ? t.pickup : t.delivery}</span>
                          {/* A free order has no slip to check, so the board says
                              so rather than showing a bare ฿0. */}
                          {o.total_satang === 0
                            ? <span className="text-veg font-medium text-xs">🎁 {t.freeOrder}</span>
                            : <span className="font-medium">{baht(o.total_satang)}</span>}
                        </div>
                        {o.status === 'confirmed' && o.prep_minutes && (
                          <div className="text-xs text-ink-3 mt-1">{t.readyIn(o.prep_minutes)}</div>
                        )}
                      </Link>
                    </li>
                  ))}
                  {col.length === 0 && <li className="text-ink-3 text-xs px-2 py-6 text-center">—</li>}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="text-ink-3 text-xs text-center mt-4">
          {t.boardFoot} <Link href="/reports" className="underline">{t.boardFootLink}</Link>
          {t.boardFootTail}
        </p>
      </main>
    </>
  );
}
