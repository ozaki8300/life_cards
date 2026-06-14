-- Life Cards usage_events cleanup
--
-- usage_events is an action log and is not intended for permanent retention.
-- Keep cards, decks, encounters, and other core data. Delete only old usage_events.
--
-- Before running the DELETE:
-- 1. Paste the SELECT below into Supabase SQL Editor.
-- 2. Confirm the target row count is expected.
-- 3. Run the DELETE only after confirming the count.

-- 1. Check how many usage_events rows are older than 90 days.
select
  count(*) as old_usage_events_count
from public.usage_events
where created_at < now() - interval '90 days';

-- 2. Delete usage_events rows older than 90 days.
delete from public.usage_events
where created_at < now() - interval '90 days';
