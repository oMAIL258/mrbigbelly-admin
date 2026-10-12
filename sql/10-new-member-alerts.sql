-- Telling the shop when somebody joins, once and only once.
--
-- An account is created by whichever comes first: opening the points page,
-- giving a number on the sign-up page, or placing an order. The stamp below is
-- claimed by whichever path gets there first, so the shop hears once.
alter table customers add column if not exists announced_at timestamptz;

-- Everybody who joined before today is already known to the shop. Without this
-- the next thing each of them does would announce them as new.
update customers set announced_at = coalesce(created_at, now()) where announced_at is null;

-- So the admin's own screens can chime the moment a member appears.
do $$
begin
  alter publication supabase_realtime add table customers;
exception
  when duplicate_object then null;
end $$;
