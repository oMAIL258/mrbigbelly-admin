-- Deals that are for collecting at the counter only.
--
-- The ordering site already treats a deal as pickup-only until this is run,
-- so the column defaults to the same thing. Untick it on the Settings page for
-- a deal that should come off deliveries too.
alter table promotions add column if not exists pickup_only boolean not null default true;
