-- Points that expire a year after they are earned, and rewards that are money
-- off an order rather than a thing to collect.
--
-- Paste the whole file once in Supabase → SQL Editor, after 04-loyalty.sql.
-- Safe to re-run.

-- ─────────────────────────────────────────────────────────────
-- 1. How long points last
--    Months rather than days, so "1 year" stays 1 year across a leap year.
--    0 means they never expire.
-- ─────────────────────────────────────────────────────────────
alter table loyalty_settings
  add column if not exists points_valid_months integer not null default 12
  check (points_valid_months >= 0);

-- ─────────────────────────────────────────────────────────────
-- 2. Each earning carries its own expiry date
--    The date is stamped when the points are earned and never moves
--    afterwards, so changing the setting cannot shorten points a customer
--    already holds. That is the promise shown to them on their profile.
-- ─────────────────────────────────────────────────────────────
alter table point_events add column if not exists expires_at timestamptz;

alter table point_events drop constraint if exists point_events_kind_check;
alter table point_events add constraint point_events_kind_check
  check (kind in ('earn', 'welcome', 'redeem', 'refund', 'manual', 'expire'));

create index if not exists point_events_expiry_idx
  on point_events (customer_id, expires_at) where delta > 0;

-- Stamped by the database rather than by whichever route happens to be
-- writing, so no way of adding points can forget to date them.
create or replace function set_point_expiry() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_months integer;
begin
  if new.delta > 0 then
    if new.expires_at is null then
      select points_valid_months into v_months from loyalty_settings limit 1;
      v_months := coalesce(v_months, 12);
      if v_months > 0 then
        new.expires_at := coalesce(new.created_at, now()) + make_interval(months => v_months);
      end if;
    end if;
  else
    -- Spending points is not itself something that expires.
    new.expires_at := null;
  end if;
  return new;
end $$;

drop trigger if exists point_events_expiry on point_events;
create trigger point_events_expiry
  before insert on point_events
  for each row execute function set_point_expiry();

-- Points earned before this file ran are dated from when they were earned,
-- which is the rule the customer is told about.
update point_events pe
   set expires_at = pe.created_at
     + make_interval(months => (select points_valid_months from loyalty_settings limit 1))
 where pe.delta > 0
   and pe.expires_at is null
   and (select points_valid_months from loyalty_settings limit 1) > 0;

-- ─────────────────────────────────────────────────────────────
-- 3. Which points are still unspent
--    Oldest points are spent first, so what expires is always the oldest
--    thing the customer has left. Every negative event — a reward claimed, an
--    adjustment, an earlier expiry — is counted against the lots in order.
-- ─────────────────────────────────────────────────────────────
create or replace function point_lots(p_customer uuid)
returns table (
  event_id   uuid,
  earned_at  timestamptz,
  expires_at timestamptz,
  amount     integer,
  remaining  integer
)
language plpgsql stable security definer set search_path = public as $$
declare
  unspent bigint;
  lot     record;
  taken   integer;
begin
  select coalesce(sum(-delta), 0) into unspent
    from point_events where customer_id = p_customer and delta < 0;

  for lot in
    select pe.id, pe.created_at, pe.expires_at, pe.delta
      from point_events pe
     where pe.customer_id = p_customer and pe.delta > 0
     order by pe.created_at, pe.id
  loop
    taken      := least(lot.delta, unspent)::integer;
    unspent    := unspent - taken;
    event_id   := lot.id;
    earned_at  := lot.created_at;
    expires_at := lot.expires_at;
    amount     := lot.delta;
    remaining  := lot.delta - taken;
    return next;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 4. Taking away what has run out
--    Written as one event covering everything due, so the customer's history
--    reads as a single line rather than a scatter of small deductions. Safe to
--    call as often as you like: once a lot has been expired it counts as spent
--    and has nothing left to take.
-- ─────────────────────────────────────────────────────────────
create or replace function expire_points(p_customer uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  due integer;
begin
  select coalesce(sum(remaining), 0) into due
    from point_lots(p_customer)
   where remaining > 0 and expires_at is not null and expires_at <= now();

  if due > 0 then
    insert into point_events (customer_id, delta, kind, note)
    values (p_customer, -due, 'expire', 'แต้มหมดอายุ / Points expired');
  end if;

  return due;
end $$;

create or replace function expire_points_all() returns integer
language plpgsql security definer set search_path = public as $$
declare
  c     record;
  total integer := 0;
begin
  for c in select id from customers where coalesce(points_balance, 0) > 0 loop
    total := total + expire_points(c.id);
  end loop;
  return total;
end $$;

-- A customer's own points are read and settled through the two sites' servers,
-- never straight from a browser. Postgres grants EXECUTE to PUBLIC by default,
-- and a revoke aimed at one role does not undo that, so the default is taken
-- away first and then handed back to the two roles that should have it.
revoke all on function point_lots(uuid)    from public;
revoke all on function expire_points(uuid) from public;
revoke all on function expire_points_all() from public;

grant execute on function point_lots(uuid)    to authenticated, service_role;
grant execute on function expire_points(uuid) to authenticated, service_role;
grant execute on function expire_points_all() to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. Rewards that are money off
--    A reward with a discount is spent on the next order rather than handed
--    over the counter. Everything else about it is unchanged, so the shop can
--    still add a free drink or a tote bag alongside these.
-- ─────────────────────────────────────────────────────────────
alter table rewards
  add column if not exists discount_satang integer
  check (discount_satang is null or discount_satang > 0);

-- A claimed voucher keeps the value it was claimed at, the same way it keeps
-- the title it was claimed under: editing the ladder later cannot change what
-- somebody is already holding.
alter table redemptions
  add column if not exists discount_satang integer
  check (discount_satang is null or discount_satang > 0);

update redemptions r
   set discount_satang = w.discount_satang
  from rewards w
 where w.id = r.reward_id
   and r.discount_satang is null
   and w.discount_satang is not null;

-- ─────────────────────────────────────────────────────────────
-- 6. What an order came to, and what was taken off it
--    total_satang stays the amount the customer actually transfers, so the
--    reports keep reading takings rather than menu value, and points are
--    earned on what was paid.
-- ─────────────────────────────────────────────────────────────
alter table orders add column if not exists subtotal_satang integer;
alter table orders add column if not exists discount_satang integer not null default 0;
alter table orders add column if not exists redemption_id uuid references redemptions(id) on delete set null;

update orders set subtotal_satang = total_satang where subtotal_satang is null;

-- A voucher is good for one order. The index is what actually enforces it,
-- whatever two tills or two taps try at once.
create unique index if not exists orders_redemption_once
  on orders (redemption_id) where redemption_id is not null;

-- ─────────────────────────────────────────────────────────────
-- 7. The shop's opening discount ladder
--    Only ever inserted into an empty rewards list, so it cannot come back
--    after the shop edits or removes these.
-- ─────────────────────────────────────────────────────────────
insert into rewards (title_th, title_en, detail_th, detail_en, points_cost, discount_satang, sort)
select
  v.title_th,
  v.title_en,
  'ใช้เป็นส่วนลดในออเดอร์ถัดไป ใช้ได้ 1 ออเดอร์ และยอดสั่งต้องมากกว่าส่วนลด',
  'Taken off your next order. One voucher per order, and the order must come to more than the discount.',
  v.cost,
  v.off,
  v.sort
from (values
  ('ส่วนลด 20 บาท',  '฿20 off',  5,  2000,  10),
  ('ส่วนลด 50 บาท',  '฿50 off',  10, 5000,  20),
  ('ส่วนลด 100 บาท', '฿100 off', 20, 10000, 30),
  ('ส่วนลด 200 บาท', '฿200 off', 50, 20000, 40)
) as v(title_th, title_en, cost, off, sort)
where not exists (select 1 from rewards);
