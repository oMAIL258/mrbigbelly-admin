-- Run this once in Supabase → SQL Editor, after the menu seed.
-- Adds the closed-shop message and the policies the photo uploader needs.

-- 1. Message shown to customers while the shop is closed
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS closed_message text;

-- 2. Menu photo storage.
--    Create the bucket in the dashboard first: Storage → New bucket →
--    name `menu-photos` → PUBLIC (ticked, so customers can see the images).
--    Then these policies let you upload from the admin while keeping
--    uploads limited to signed-in staff.
DROP POLICY IF EXISTS menu_photos_public_read ON storage.objects;
CREATE POLICY menu_photos_public_read ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'menu-photos');

DROP POLICY IF EXISTS menu_photos_staff_write ON storage.objects;
CREATE POLICY menu_photos_staff_write ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'menu-photos');

DROP POLICY IF EXISTS menu_photos_staff_update ON storage.objects;
CREATE POLICY menu_photos_staff_update ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'menu-photos');

DROP POLICY IF EXISTS menu_photos_staff_delete ON storage.objects;
CREATE POLICY menu_photos_staff_delete ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'menu-photos');

-- 3. The admin reads store_settings while signed in and the customer site
--    reads it anonymously to know whether the shop is open.
DROP POLICY IF EXISTS settings_read ON store_settings;
CREATE POLICY settings_read ON store_settings
  FOR SELECT TO anon, authenticated USING (true);
