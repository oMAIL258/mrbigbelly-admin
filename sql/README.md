# SQL seeds

Paste these files in Supabase → SQL Editor, in order:

1. **`seed-menu.sql`** — all 16 categories, every menu item (prices in satang), and the shared option groups wired up per item (rice choice, pasta type, chicken style, bowl base, milk, ginger/fingerroot, juice picks). Idempotent: re-run after a menu edit and it will update in place.

Prerequisites: the schema (tables `categories`, `menu_items`, `option_groups`, `options`, enum `option_pick_kind`) must already exist. If you haven't run it yet, paste the schema from the Phase 2 Setup doc first.
