-- Who an order is for, on every order rather than only the delivered ones.
-- Paste the whole file once in Supabase → SQL Editor. Safe to re-run.
--
-- A customer collecting at the shop is now asked for their name and number
-- too, so the counter knows who to call when the food is ready, and so the
-- number lands on their member account and finds them again next time.
--
-- Run this BEFORE deploying the sites: the order page writes these two
-- columns, and an order naming a column that does not exist is refused.

-- ─────────────────────────────────────────────────────────────
-- 1. The two columns
--    Kept on `orders` rather than on `delivery_details`, because a pickup
--    order has a name and a number but no address and no area to put them
--    beside.
-- ─────────────────────────────────────────────────────────────
alter table orders add column if not exists contact_name text;
alter table orders add column if not exists contact_phone text;

-- ─────────────────────────────────────────────────────────────
-- 2. Orders already taken
--    Every delivery ever placed carries the name and number typed at
--    checkout. Copying them up means the shop's order page reads an old
--    order the same way it reads a new one, with no fallback to remember.
-- ─────────────────────────────────────────────────────────────
update orders o
   set contact_name  = coalesce(o.contact_name, nullif(btrim(d.contact_name), '')),
       contact_phone = coalesce(o.contact_phone, normalise_phone(d.contact_phone))
  from delivery_details d
 where d.order_id = o.id
   and (o.contact_name is null or o.contact_phone is null);
