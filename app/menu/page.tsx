'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { baht } from '@/lib/money';
import { Nav } from '@/components/Nav';

type Item = { id: string; name_en: string; name_th: string | null; price_satang: number; is_available: boolean; category_id: string };
type Cat = { id: string; name_en: string; sort: number };

export default function MenuAdminPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const sb = supabaseBrowser();
    const [c, i] = await Promise.all([
      sb.from('categories').select('id, name_en, sort').order('sort'),
      sb.from('menu_items').select('id, name_en, name_th, price_satang, is_available, category_id').order('sort'),
    ]);
    if (c.data) setCats(c.data as Cat[]);
    if (i.data) setItems(i.data as Item[]);
  }
  useEffect(() => { load(); }, []);

  async function toggle(it: Item) {
    setBusy(it.id);
    await supabaseBrowser().from('menu_items').update({ is_available: !it.is_available }).eq('id', it.id);
    await load();
    setBusy(null);
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl p-4">
        <h1 className="serif text-xl mb-3">Menu</h1>
        <p className="text-ink-3 text-sm mb-4">Toggle items on/off while you’re open. Full editing (prices, options, photos) comes next.</p>
        {cats.map((c) => {
          const list = items.filter((i) => i.category_id === c.id);
          if (list.length === 0) return null;
          return (
            <section key={c.id} className="mb-5">
              <h2 className="serif text-base mb-2">{c.name_en}</h2>
              <ul className="card divide-y divide-rule">
                {list.map((it) => (
                  <li key={it.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{it.name_en}</div>
                      {it.name_th && <div className="text-ink-3 text-xs">{it.name_th}</div>}
                    </div>
                    <div className="text-sm text-ink-2">{baht(it.price_satang)}</div>
                    <button
                      disabled={busy === it.id}
                      onClick={() => toggle(it)}
                      className={`btn ${it.is_available ? 'bg-white border border-rule' : 'bg-ink-3/20'}`}
                    >
                      {it.is_available ? 'Available' : 'Sold out'}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
    </>
  );
}
