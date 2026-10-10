-- Phone numbers on member accounts, and points for eating in the shop.
-- Paste the whole file once in Supabase → SQL Editor. Safe to re-run.
--
-- Three things come out of this:
--   1. A member can be found at the counter by their phone number.
--   2. A meal eaten in the shop is written down and earns points, on the same
--      rate as a website order.
--   3. Existing delivery customers get their number filled in automatically,
--      so the counter can find them from day one.

-- ─────────────────────────────────────────────────────────────
-- 1. One way of writing a phone number
--    "081-234-5678", "081 234 5678" and "+66812345678" are the same customer,
--    so the number is tidied to one shape before it is stored or looked up.
--    Both sites call the matching function in their own code; this one is what
--    the backfill below uses and what settles any disagreement.
-- ─────────────────────────────────────────────────────────────
create or replace function normalise_phone(p text) returns text
language sql immutable set search_path = public as $$
  with digits as (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as s)
  select case
    -- Thailand's country code, written out: +66 81 … is the local 081 ….
    when left(s, 2) = '66' and length(s) in (11, 12) then '0' || substr(s, 3)
    when length(s) >= 9 then s
    else null
  end
  from digits
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. The number itself
--    Two accounts must never hold the same number, or the counter would have
--    no way of telling which person is standing in front of it.
-- ─────────────────────────────────────────────────────────────
alter table customers add column if not exists phone text;

create unique index if not exists customers_phone_unique
  on customers (phone) where phone is not null;

-- A phone number is the one thing on a member's record that identifies them
-- off the site, so the table is pinned shut here rather than being trusted to
-- have been left that way. Only a signed-in admin has a policy on it; the
-- customer site reads it through its own server with the service key.
alter table customers enable row level security;

-- ─────────────────────────────────────────────────────────────
-- 3. Eating in the shop
--    A website order has items, a slip and a kitchen to go through. A meal
--    eaten in is just a date, an amount and the points it was worth, so it is
--    kept on its own and leaves the order board and the day's takings alone.
-- ─────────────────────────────────────────────────────────────
create table if not exists store_visits (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references customers(id) on delete cascade,
  -- What they spent, in satang, the same unit the rest of the shop uses.
  amount_satang  integer not null check (amount_satang > 0),
  points_awarded integer not null default 0 check (points_awarded >= 0),
  note           text,
  created_by     text,
  created_at     timestamptz not null default now()
);

create index if not exists store_visits_customer_idx
  on store_visits (customer_id, created_at desc);
create index if not exists store_visits_day_idx
  on store_visits (created_at desc);

-- The points themselves live in the same history as every other point, so the
-- customer sees one list and the balance stays the sum of it.
alter table point_events add column if not exists visit_id uuid
  references store_visits(id) on delete set null;

alter table point_events drop constraint if exists point_events_kind_check;
alter table point_events add constraint point_events_kind_check
  check (kind in ('earn', 'welcome', 'redeem', 'refund', 'manual', 'expire', 'instore'));

-- One meal pays once, however many times Save is pressed.
create unique index if not exists point_events_instore_once
  on point_events (visit_id) where kind = 'instore';

-- Who may read and write it: the admin is signed in, and the customer site
-- reaches it only through its own server with the service key.
alter table store_visits enable row level security;

drop policy if exists store_visits_staff on store_visits;
create policy store_visits_staff on store_visits
  for all to authenticated using (true) with check (true);

-- ─────────────────────────────────────────────────────────────
-- 4. Numbers the shop already has
--    Anyone who has had an order delivered typed a contact number at
--    checkout. That is almost always their own, so it is copied onto the
--    account — but only where the number belongs to exactly one customer, so
--    that two people who shared a phone at checkout do not end up able to
--    spend each other's points.
-- ─────────────────────────────────────────────────────────────
with latest as (
  select distinct on (o.customer_id)
         o.customer_id,
         normalise_phone(d.contact_phone) as phone
    from orders o
    join delivery_details d on d.order_id = o.id
   where o.customer_id is not null
     and normalise_phone(d.contact_phone) is not null
   order by o.customer_id, o.created_at desc
),
unambiguous as (
  select phone, (array_agg(customer_id))[1] as customer_id
    from latest
   group by phone
  having count(distinct customer_id) = 1
)
update customers c
   set phone = u.phone
  from unambiguous u
 where c.id = u.customer_id
   and c.phone is null
   and not exists (select 1 from customers x where x.phone = u.phone);

-- ─────────────────────────────────────────────────────────────
-- 5. What a number may be used for
--    The customer site looks a number up only to tell a member they are
--    already registered; the counter is the only place that searches by it.
--    Nobody browsing anonymously may read either, so the function is kept off
--    the public role the same way the point functions are.
-- ─────────────────────────────────────────────────────────────
create or replace function customer_by_phone(p_phone text)
returns table (id uuid, display_name text, phone text, points_balance integer)
language sql stable security definer set search_path = public as $$
  select c.id, c.display_name, c.phone, c.points_balance
    from customers c
   where c.phone is not null
     and c.phone = normalise_phone(p_phone)
   limit 1
$$;

revoke all on function customer_by_phone(text) from public;
grant execute on function customer_by_phone(text) to authenticated, service_role;
