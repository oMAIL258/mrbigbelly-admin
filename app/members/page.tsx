'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { baht } from '@/lib/money';
import { Nav } from '@/components/Nav';
import { useLang } from '@/lib/i18n';
import { dayKey, dayLabel } from '@/lib/day';

type Member = {
  id: string;
  display_name: string | null;
  points_balance: number;
  created_at: string;
};
type OrderRow = { customer_id: string | null; total_satang: number; created_at: string; status: string };

// Revenue counts an order the shop accepted, the same rule Reports uses.
const EARNED = ['confirmed', 'ready', 'done'];

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const { lang, t } = useLang();

  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const [c, o] = await Promise.all([
        sb.from('customers').select('id, display_name, points_balance, created_at')
          .order('points_balance', { ascending: false }).limit(500),
        sb.from('orders').select('customer_id, total_satang, created_at, status').limit(5000),
      ]);
      setMembers((c.data ?? []) as Member[]);
      setOrders((o.data ?? []) as OrderRow[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const m = new Map<string, { count: number; spent: number; last: string }>();
    for (const o of orders) {
      if (!o.customer_id || !EARNED.includes(o.status)) continue;
      const cur = m.get(o.customer_id) ?? { count: 0, spent: 0, last: o.created_at };
      m.set(o.customer_id, {
        count: cur.count + 1,
        spent: cur.spent + o.total_satang,
        last: o.created_at > cur.last ? o.created_at : cur.last,
      });
    }
    return m;
  }, [orders]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((m) => (m.display_name ?? '').toLowerCase().includes(needle));
  }, [members, q]);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h1 className="serif text-xl">{t.members}</h1>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.searchMember}
            className="rounded-xl border border-rule p-2 text-sm w-56"
          />
        </div>

        {loading && <p className="text-ink-3 text-sm text-center py-10">{t.loading}</p>}
        {!loading && shown.length === 0 && (
          <p className="text-ink-3 text-sm text-center py-10">{t.noMembers}</p>
        )}

        {shown.length > 0 && (
          <ul className="card divide-y divide-rule stagger">
            {shown.map((m) => {
              const s = stats.get(m.id);
              return (
                <li key={m.id}>
                  <Link href={`/members/${m.id}`} className="flex items-center gap-3 p-3 hover:bg-surface-2">
                    <span className="h-9 w-9 shrink-0 rounded-full bg-accent-soft/40 text-accent flex items-center justify-center text-sm">
                      {(m.display_name ?? '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm truncate">{m.display_name ?? t.lineCustomer}</span>
                      <span className="block text-ink-3 text-xs">
                        {s ? `${t.colLastSeen} ${dayLabel(dayKey(s.last), lang, t)}` : t.nothingYet}
                      </span>
                    </span>
                    <span className="text-right w-20 shrink-0">
                      <span className="block text-ink-3 text-[11px]">{t.colOrders}</span>
                      <span className="block text-sm">{s?.count ?? 0}</span>
                    </span>
                    <span className="text-right w-24 shrink-0 hidden sm:block">
                      <span className="block text-ink-3 text-[11px]">{t.colSpent}</span>
                      <span className="block text-sm">{baht(s?.spent ?? 0)}</span>
                    </span>
                    <span className="text-right w-20 shrink-0">
                      <span className="block text-ink-3 text-[11px]">{t.colPoints}</span>
                      <span className="block text-base font-medium text-gold">{m.points_balance}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
