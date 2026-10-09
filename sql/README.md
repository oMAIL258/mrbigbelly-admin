# SQL seeds

Paste these files in Supabase → SQL Editor, in order:

1. **`seed-menu.sql`** — all 16 categories, every menu item (prices in satang), and the shared option groups wired up per item (rice choice, pasta type, chicken style, bowl base, milk, ginger/fingerroot, juice picks). Idempotent: re-run after a menu edit and it will update in place.

Prerequisites: the schema (tables `categories`, `menu_items`, `option_groups`, `options`, enum `option_pick_kind`) must already exist. If you haven't run it yet, paste the schema from the Phase 2 Setup doc first.

2. **`02-photos-and-closing.sql`** — the closed-shop message and the policies the menu-photo uploader needs. Create the `menu-photos` bucket (PUBLIC) in Storage first.

3. **`03-staff-alerts.sql`** — who gets a LINE message when an order arrives.

4. **`04-loyalty.sql`** — points, rewards and the approvals queue. Create the `reward-photos` bucket (PUBLIC) in Storage first, then paste the file. It adds:
   - `loyalty_settings` — baht per point, welcome points, and an on/off switch, all editable on the admin's Settings page.
   - `menu_items.bonus_points` — extra points for ordering that dish, editable on the Menu page.
   - `point_events` — every movement of points. A customer's balance is kept in step by a database trigger, and a unique index means an order can only ever earn once.
   - `rewards` and `redemptions` — what the shop offers and who has asked for it.
