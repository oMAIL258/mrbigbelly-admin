-- Points, rewards and redemption approvals.
-- Paste the whole file once in Supabase → SQL Editor. Safe to re-run.
--
-- Before running, create one storage bucket in the dashboard:
--   Storage → New bucket → name `reward-photos` → PUBLIC (ticked).
-- The policies at the bottom assume it exists.

-- ─────────────────────────────────────────────────────────────
-- 1. How points are earned
-- ─────────────────────────────────────────────────────────────
create table if not exists loyalty_settings (
  id                uuid primary key default gen_random_uuid(),
  -- Spend this much (in satang) to earn one point. 10000 = ฿100 per point.
  satang_per_point  integer not null default 10000 check (satang_per_point > 0),
  -- Given once, the first time a customer orders.
  welcome_points    integer not null default 0 check (welcome_points >= 0),
  points_enabled    boolean not null default true,
  updated_at        timestamptz not null default now()
);

insert into loyalty_settings (satang_per_point)
select 10000 where not exists (select 1 from loyalty_settings);

-- Extra points for ordering a particular dish, on top of what it is worth.
alter table menu_items add column if not exists bonus_points integer not null default 0;

-- ─────────────────────────────────────────────────────────────
-- 2. Every movement of points, and the running balance
-- ─────────────────────────────────────────────────────────────
alter table customers add column if not exists points_balance integer not null default 0;

create table if not exists point_events (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references customers(id) on delete cascade,
  -- Positive earns, negative spends. The customer's balance is the sum.
  delta         integer not null,
  kind          text not null check (kind in ('earn', 'welcome', 'redeem', 'refund', 'manual')),
  note          text,
  order_id      uuid references orders(id) on delete set null,
  redemption_id uuid,
  created_by    text,
  created_at    timestamptz not null default now()
);

create index if not exists point_events_customer_idx
  on point_events (customer_id, created_at desc);

-- An order may only ever earn once, however many times it is confirmed or the
-- page is refreshed. The insert simply fails the second time.
create unique index if not exists point_events_earn_once
  on point_events (order_id) where kind = 'earn';

create unique index if not exists point_events_welcome_once
  on point_events (customer_id) where kind = 'welcome';

-- The balance is kept by the database rather than by whoever happens to be
-- writing, so no path through the two sites can leave it disagreeing with the
-- history underneath it.
create or replace function apply_point_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update customers set points_balance = points_balance + new.delta where id = new.customer_id;
  elsif tg_op = 'DELETE' then
    update customers set points_balance = points_balance - old.delta where id = old.customer_id;
  end if;
  return null;
end $$;

drop trigger if exists point_events_apply on point_events;
create trigger point_events_apply
  after insert or delete on point_events
  for each row execute function apply_point_event();

-- ─────────────────────────────────────────────────────────────
-- 3. Rewards the shop offers
-- ─────────────────────────────────────────────────────────────
create table if not exists rewards (
  id            uuid primary key default gen_random_uuid(),
  title_th      text not null,
  title_en      text not null,
  detail_th     text,
  detail_en     text,
  photo_url     text,
  points_cost   integer not null check (points_cost > 0),
  -- null means as many as customers want to claim
  stock         integer check (stock is null or stock >= 0),
  is_active     boolean not null default true,
  starts_at     timestamptz,
  ends_at       timestamptz,
  sort          integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 4. A customer asking to use one, which the shop approves
-- ─────────────────────────────────────────────────────────────
create table if not exists redemptions (
  id              uuid primary key default gen_random_uuid(),
  -- Short code the customer shows at the counter.
  code            text unique,
  customer_id     uuid not null references customers(id) on delete cascade,
  reward_id       uuid references rewards(id) on delete set null,
  -- Snapshots, so editing a reward later does not rewrite what was claimed.
  reward_title_th text not null,
  reward_title_en text not null,
  points_cost     integer not null,
  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected', 'used')),
  reject_reason   text,
  decided_at      timestamptz,
  decided_by      text,
  used_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists redemptions_pending_idx
  on redemptions (status, created_at desc);
create index if not exists redemptions_customer_idx
  on redemptions (customer_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 5. Who may read and write what
--    The admin is signed in (authenticated). The customer site reaches these
--    tables only through its own server, which uses the service key and is not
--    subject to RLS — a browser must never be able to write points.
-- ─────────────────────────────────────────────────────────────
alter table loyalty_settings enable row level security;
alter table point_events     enable row level security;
alter table rewards          enable row level security;
alter table redemptions      enable row level security;

drop policy if exists loyalty_settings_staff on loyalty_settings;
create policy loyalty_settings_staff on loyalty_settings
  for all to authenticated using (true) with check (true);

drop policy if exists point_events_staff on point_events;
create policy point_events_staff on point_events
  for all to authenticated using (true) with check (true);

drop policy if exists redemptions_staff on redemptions;
create policy redemptions_staff on redemptions
  for all to authenticated using (true) with check (true);

drop policy if exists rewards_staff on rewards;
create policy rewards_staff on rewards
  for all to authenticated using (true) with check (true);

-- Customers browse the rewards they could claim, and nothing else.
drop policy if exists rewards_public_read on rewards;
create policy rewards_public_read on rewards
  for select to anon using (is_active);

-- The admin lists and searches members.
drop policy if exists customers_staff on customers;
create policy customers_staff on customers
  for all to authenticated using (true) with check (true);

-- ─────────────────────────────────────────────────────────────
-- 6. Reward photos (bucket `reward-photos`, created in the dashboard as PUBLIC)
-- ─────────────────────────────────────────────────────────────
drop policy if exists reward_photos_public_read on storage.objects;
create policy reward_photos_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'reward-photos');

drop policy if exists reward_photos_staff_write on storage.objects;
create policy reward_photos_staff_write on storage.objects
  for insert to authenticated with check (bucket_id = 'reward-photos');

drop policy if exists reward_photos_staff_update on storage.objects;
create policy reward_photos_staff_update on storage.objects
  for update to authenticated using (bucket_id = 'reward-photos');

drop policy if exists reward_photos_staff_delete on storage.objects;
create policy reward_photos_staff_delete on storage.objects
  for delete to authenticated using (bucket_id = 'reward-photos');
