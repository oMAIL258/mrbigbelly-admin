-- Morning hours for some categories, and time-limited bundle deals.
--
-- Both sites keep working before this is run: without it every category is
-- orderable all day and no deal is offered.

-- ─────────────────────────────────────────────────────────────
-- 1. When a category can first be ordered each day, in shop time.
--    Empty means all day. Between opening and this time the category is
--    still shown, marked with the time it opens, but cannot go in the cart.
-- ─────────────────────────────────────────────────────────────
alter table categories add column if not exists available_from time;

-- From 07:30 only drinks, bowls and sandwiches are made; the rest of the
-- kitchen starts at 09:00. Only categories nobody has set yet are touched, so
-- re-running this cannot undo a time changed on the admin's Menu page.
update categories
   set available_from = '09:00'
 where available_from is null
   and slug not in ('coffee', 'tea', 'smooth', 'juice', 'bowl', 'sand');

-- The Menu page sets the time while signed in.
drop policy if exists categories_staff_update on categories;
create policy categories_staff_update on categories
  for update to authenticated using (true) with check (true);

-- ─────────────────────────────────────────────────────────────
-- 2. Deals: any N of the listed items for one price, between two times.
--    Each drink is priced with whatever was picked on it (iced included),
--    and the deal only ever takes money off: two espressos at ฿100 stay ฿100.
-- ─────────────────────────────────────────────────────────────
create table if not exists promotions (
  id                  uuid primary key default gen_random_uuid(),
  title_th            text not null,
  title_en            text not null,
  is_active           boolean not null default true,
  starts_at           time not null,
  ends_at             time not null,
  bundle_qty          integer not null default 2 check (bundle_qty >= 2),
  bundle_price_satang integer not null check (bundle_price_satang > 0),
  item_ids            uuid[] not null default '{}',
  created_at          timestamptz not null default now()
);

alter table promotions enable row level security;

-- Customers read them to price the cart; the ordering site's server checks
-- them again with the service key before taking anything off.
drop policy if exists promotions_read on promotions;
create policy promotions_read on promotions
  for select to anon, authenticated using (true);

drop policy if exists promotions_write on promotions;
create policy promotions_write on promotions
  for all to authenticated using (true) with check (true);

-- The morning coffee deal, inserted only into an empty list so it cannot come
-- back after the shop edits or removes it.
insert into promotions (title_th, title_en, starts_at, ends_at, bundle_qty, bundle_price_satang, item_ids)
select 'กาแฟ 2 แก้ว 130 บาท ร้อนหรือเย็นก็ได้',
       'Any 2 coffees for ฿130, hot or iced',
       '07:30', '10:00', 2, 13000,
       array(select id from menu_items where slug in ('espresso', 'ameri', 'latte', 'cappu', 'es-yen'))
 where not exists (select 1 from promotions);

-- ─────────────────────────────────────────────────────────────
-- 3. What a deal took off an order. total_satang stays what was transferred:
--    subtotal − promo − voucher = total.
-- ─────────────────────────────────────────────────────────────
alter table orders add column if not exists promo_discount_satang integer not null default 0;
alter table orders add column if not exists promotion_id uuid references promotions(id) on delete set null;
