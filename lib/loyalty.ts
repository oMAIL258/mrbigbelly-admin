import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Earned = { base: number; bonus: number; welcome: number; total: number; balance: number };

type Admin = SupabaseClient;

/** What an order is worth, before anything is written down. */
export async function pointsForOrder(admin: Admin, orderId: string) {
  const { data: settings } = await admin
    .from('loyalty_settings')
    .select('satang_per_point, points_enabled, welcome_points')
    .limit(1)
    .maybeSingle();

  const per = settings?.satang_per_point ?? 10000;
  const enabled = settings?.points_enabled ?? true;
  const welcome = settings?.welcome_points ?? 0;

  const { data: order } = await admin
    .from('orders')
    .select('total_satang, customer_id')
    .eq('id', orderId)
    .maybeSingle();
  if (!order?.customer_id) return null;

  const base = enabled ? Math.floor((order.total_satang ?? 0) / per) : 0;

  // A dish may be worth extra points on its own, which is how the shop runs a
  // "order this and get 50 points" promotion without touching the price.
  const { data: lines } = await admin
    .from('order_items')
    .select('qty, menu_items(bonus_points)')
    .eq('order_id', orderId);

  type Line = { qty: number; menu_items: { bonus_points: number | null } | { bonus_points: number | null }[] | null };
  const bonus = enabled
    ? ((lines ?? []) as Line[]).reduce((n, l) => {
        // PostgREST hands an embedded row back as an object or a one-element
        // array depending on what it can prove about the relationship.
        const item = Array.isArray(l.menu_items) ? l.menu_items[0] : l.menu_items;
        return n + (item?.bonus_points ?? 0) * (l.qty ?? 0);
      }, 0)
    : 0;

  return { customerId: order.customer_id as string, base, bonus, welcome, enabled };
}

/**
 * Credit an order's points, once. The unique index on point_events does the
 * enforcing, so a double tap on Confirm cannot pay twice.
 */
export async function awardForOrder(admin: Admin, orderId: string): Promise<Earned | null> {
  const calc = await pointsForOrder(admin, orderId);
  if (!calc || !calc.enabled) return null;
  const { customerId, base, bonus, welcome } = calc;

  // Only counted as given when the insert actually went through: the unique
  // index refuses it for anyone who already had their welcome, and the
  // customer must not be told twice about the same fifty points.
  let given = 0;
  if (welcome > 0) {
    const { error } = await admin.from('point_events').insert({
      customer_id: customerId, delta: welcome, kind: 'welcome', note: 'สมาชิกใหม่ / Welcome',
    });
    if (!error) given = welcome;
  }

  const earn = base + bonus;
  if (earn > 0) {
    const { error } = await admin.from('point_events').insert({
      customer_id: customerId,
      delta: earn,
      kind: 'earn',
      order_id: orderId,
      note: bonus > 0 ? `ยอดซื้อ ${base} + โบนัส ${bonus}` : null,
    });
    // Already credited: report what it was worth without claiming to pay again.
    if (error) {
      const balance = await balanceOf(admin, customerId);
      return { base, bonus, welcome: given, total: given, balance };
    }
  }

  // What the customer gained just now, which is what the message will say.
  return { base, bonus, welcome: given, total: earn + given, balance: await balanceOf(admin, customerId) };
}

export async function balanceOf(admin: Admin, customerId: string): Promise<number> {
  const { data } = await admin.from('customers').select('points_balance').eq('id', customerId).maybeSingle();
  return data?.points_balance ?? 0;
}

/** Six characters the counter can read out loud without ambiguity. */
export function shortCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
