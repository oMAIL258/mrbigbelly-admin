-- Who gets a LINE message the moment a customer places an order.
-- Rows are LINE profiles the shop has seen before, picked on the Settings page.
create table if not exists staff_alerts (
  line_user_id text primary key,
  display_name text,
  created_at    timestamptz not null default now()
);

alter table staff_alerts enable row level security;

drop policy if exists staff_alerts_read on staff_alerts;
create policy staff_alerts_read on staff_alerts
  for select to authenticated using (true);

drop policy if exists staff_alerts_write on staff_alerts;
create policy staff_alerts_write on staff_alerts
  for all to authenticated using (true) with check (true);
