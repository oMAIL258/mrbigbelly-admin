'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { baht } from '@/lib/money';
import { Nav } from '@/components/Nav';

type Order = {
  id: string;
  short_code: string | null;
  status: 'new' | 'confirmed' | 'ready' | 'done' | 'rejected';
  total_satang: number;
  fulfilment_mode: 'pickup' | 'delivery';
  prep_minutes: number | null;
  created_at: string;
};

const COLS: { key: Order['status']; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'confirmed', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'done', label: 'Done' },
];

export default function OrderBoardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [bellOn, setBellOn] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    (async () => {
      const { data, error } = await sb.from('orders')
        .select('id, short_code, status, total_satang, fulfilment_mode, prep_minutes, created_at')
        .in('status', ['new', 'confirmed', 'ready', 'done'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) { setLoadError(error.message); return; }
      setOrders((data ?? []) as Order[]);
    })();
    const ch = sb.channel('orders-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        setOrders((cur) => {
          if (payload.eventType === 'INSERT') return [payload.new as Order, ...cur];
          if (payload.eventType === 'UPDATE') return cur.map((o) => o.id === (payload.new as Order).id ? (payload.new as Order) : o);
          return cur;
        });
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, []);

  const newCount = orders.filter((o) => o.status === 'new').length;

  // Keep chiming while anything is still unaccepted, so a new order can't be
  // missed in a noisy kitchen — not just once on arrival.
  useEffect(() => {
    if (!bellOn || newCount === 0) return;
    ding();
    const t = setInterval(ding, 15000);
    return () => clearInterval(t);
  }, [bellOn, newCount]);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="serif text-xl">
            Order board
            {newCount > 0 && (
              <span className="ml-2 rounded-full bg-accent text-white text-sm px-2 py-0.5 align-middle">
                {newCount} waiting
              </span>
            )}
          </h1>
          <button onClick={() => setBellOn((v) => !v)} className="btn-outline">
            {bellOn ? '🔔 Sound on' : '🔕 Sound off'}
          </button>
        </div>
        {loadError && (
          <div className="card border-accent p-3 mb-3 text-sm">
            <strong className="text-accent">Could not load orders.</strong>
            <div className="text-ink-2 mt-1">{loadError}</div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {COLS.map((c) => {
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
                          <span className="text-xs text-ink-3">{new Date(o.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="text-sm mt-1 flex justify-between">
                          <span>{o.fulfilment_mode === 'pickup' ? 'Pickup' : 'Delivery'}</span>
                          <span className="font-medium">{baht(o.total_satang)}</span>
                        </div>
                        {o.status === 'confirmed' && o.prep_minutes && (
                          <div className="text-xs text-ink-3 mt-1">Ready in {o.prep_minutes} min</div>
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
      </main>
    </>
  );
}

function ding() {
  try {
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new AC();
    const now = ctx.currentTime;
    [880, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.18); osc.stop(now + i * 0.18 + 0.32);
    });
  } catch { /* audio blocked */ }
}
