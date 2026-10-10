'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { baht } from '@/lib/money';
import { Nav } from '@/components/Nav';
import { useLang } from '@/lib/i18n';
import { dayKey, dayLabel } from '@/lib/day';
import { prettyPhone } from '@/lib/phone';

type Member = {
  id: string;
  display_name: string | null;
  phone: string | null;
  points_balance: number;
  created_at: string;
};
type OrderRow = { customer_id: string | null; total_satang: number; created_at: string; status: string };
type VisitRow = { customer_id: string; amount_satang: number; created_at: string };

// Revenue counts an order the shop accepted, the same rule Reports uses.
const EARNED = ['confirmed', 'ready', 'done'];

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const { lang, t } = useLang();

  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      // Points run out on a date, so a customer who has stopped visiting would
      // still be listed holding them. Opening the list settles everyone first,
      // which keeps this page and the customer's own screen telling the same
      // story.
      await sb.rpc('expire_points_all');
      const [c, o, v] = await Promise.all([
        sb.from('customers').select('id, display_name, phone, points_balance, created_at')
          .order('points_balance', { ascending: false }).limit(500),
        // Only the orders that count towards a member's total are wanted, and
        // the page threw the rest away after downloading them. Rejected and
        // unconfirmed ones are left on the server instead.
        sb.from('orders').select('customer_id, total_satang, created_at, status')
          .in('status', EARNED).limit(5000),
        // What a customer is worth to the shop counts the meals they ate at a
        // table as much as the ones they had sent to them.
        sb.from('store_visits').select('customer_id, amount_satang, created_at').limit(5000),
      ]);
      setMembers((c.data ?? []) as Member[]);
      setOrders((o.data ?? []) as OrderRow[]);
      setVisits((v.data ?? []) as VisitRow[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const m = new Map<string, { count: number; spent: number; last: string }>();
    const add = (id: string, amount: number, at: string) => {
      const cur = m.get(id) ?? { count: 0, spent: 0, last: at };
      m.set(id, {
        count: cur.count + 1,
        spent: cur.spent + amount,
        last: at > cur.last ? at : cur.last,
      });
    };
    for (const o of orders) {
      if (!o.customer_id || !EARNED.includes(o.status)) continue;
      add(o.customer_id, o.total_satang, o.created_at);
    }
    for (const v of visits) add(v.customer_id, v.amount_satang, v.created_at);
    return m;
  }, [orders, visits]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return members;
    // A phone number gets typed with dashes, spaces or none of either, so only
    // the digits of it are compared.
    const digits = needle.replace(/[^0-9]/g, '');
    return members.filter((m) =>
      (m.display_name ?? '').toLowerCase().includes(needle)
      || (digits.length >= 3 && (m.phone ?? '').includes(digits)));
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
                      <span className="block text-ink-3 text-xs truncate">
                        {m.phone ? prettyPhone(m.phone) : t.noPhoneYet}
                        {s ? ` · ${dayLabel(dayKey(s.last), lang, t)}` : ''}
                      </span>
                    </span>
                    <span className="text-right w-16 shrink-0">
                      <span className="block text-ink-3 text-[11px]">{t.colVisits}</span>
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
