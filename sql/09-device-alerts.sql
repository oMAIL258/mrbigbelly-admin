-- Devices that get rung when an order arrives, even with the board closed.
-- One row per installed admin app. The ordering site's server reads these and
-- asks Android's push service to wake the device.
create table if not exists push_subscriptions (
  endpoint   text primary key,
  p256dh     text not null,
  auth       text not null,
  label      text,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

-- Only a signed-in admin may add or look at them. The ordering site reads
-- them with the service key, which is not bound by these policies.
drop policy if exists push_subscriptions_read on push_subscriptions;
create policy push_subscriptions_read on push_subscriptions
  for select to authenticated using (true);

drop policy if exists push_subscriptions_write on push_subscriptions;
create policy push_subscriptions_write on push_subscriptions
  for all to authenticated using (true) with check (true);
