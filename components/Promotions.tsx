'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useLang, pickName } from '@/lib/i18n';

type Promo = {
  id: string;
  title_th: string;
  title_en: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  bundle_qty: number;
  bundle_price_satang: number;
  item_ids: string[];
};
type Cat = { id: string; name_en: string; name_th: string | null };
type Item = { id: string; name_en: string; category_id: string };

/** Deals the customer site prices into the cart: any N of the ticked dishes
 *  for one price, between two times of day. */
export function Promotions() {
  const { lang, t } = useLang();
  const [promos, setPromos] = useState<Promo[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const sb = supabaseBrowser();
    const [p, c, i] = await Promise.all([
      sb.from('promotions').select('*').order('created_at'),
      sb.from('categories').select('id, name_en, name_th').order('sort'),
      sb.from('menu_items').select('id, name_en, category_id').order('sort'),
    ]);
    // The table arrives with sql/11; until then the card says so.
    setMissing(Boolean(p.error));
    setPromos((p.data ?? []) as Promo[]);
    setCats((c.data ?? []) as Cat[]);
    setItems((i.data ?? []) as Item[]);
  }
  useEffect(() => { void load(); }, []);

  async function save(p: Promo) {
    setErr(null);
    const { id, ...row } = p;
    const { error } = await supabaseBrowser().from('promotions').update(row).eq('id', id);
    if (error) setErr(error.message);
  }

  function edit(id: string, patch: Partial<Promo>, now = false) {
    setPromos((cur) => (cur ?? []).map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, ...patch };
      if (now) void save(next);
      return next;
    }));
  }

  async function add() {
    setErr(null);
    const { error } = await supabaseBrowser().from('promotions').insert({
      title_th: t.promoNewTh, title_en: t.promoNewEn, is_active: false,
      starts_at: '07:30', ends_at: '10:00', bundle_qty: 2, bundle_price_satang: 10000, item_ids: [],
    });
    if (error) setErr(error.message); else await load();
  }

  async function remove(p: Promo) {
    if (!window.confirm(t.promoDeleteConfirm)) return;
    const { error } = await supabaseBrowser().from('promotions').delete().eq('id', p.id);
    if (error) setErr(error.message); else await load();
  }

  if (!promos) return null;

  return (
    <section className="card p-4 space-y-3">
      <h2 className="serif text-base">{t.promosTitle}</h2>
      <p className="text-ink-3 text-sm">{t.promosNote}</p>
      {missing && <p className="text-accent text-sm">{t.needsSql11}</p>}

      {promos.map((p) => {
        const commit = () => edit(p.id, {}, true);
        return (
          <div key={p.id} className={`rounded-xl border p-3 space-y-2 ${p.is_active ? 'border-gold' : 'border-rule'}`}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={p.is_active}
                onChange={(e) => edit(p.id, { is_active: e.target.checked }, true)}
                className="h-4 w-4 accent-accent"
              />
              {t.promoOn}
            </label>
            <label className="text-sm block">
              {t.promoTitleTh}
              <input value={p.title_th} onChange={(e) => edit(p.id, { title_th: e.target.value })} onBlur={commit}
                className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
            </label>
            <label className="text-sm block">
              {t.promoTitleEn}
              <input value={p.title_en} onChange={(e) => edit(p.id, { title_en: e.target.value })} onBlur={commit}
                className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">
                {t.promoFrom}
                <input type="time" value={p.starts_at.slice(0, 5)}
                  onChange={(e) => e.target.value && edit(p.id, { starts_at: e.target.value + ':00' })} onBlur={commit}
                  className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
              </label>
              <label className="text-sm">
                {t.promoTo}
                <input type="time" value={p.ends_at.slice(0, 5)}
                  onChange={(e) => e.target.value && edit(p.id, { ends_at: e.target.value + ':00' })} onBlur={commit}
                  className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
              </label>
              <label className="text-sm">
                {t.promoQty}
                <input type="number" min={2} value={p.bundle_qty}
                  onChange={(e) => edit(p.id, { bundle_qty: Math.max(2, Number(e.target.value) || 2) })} onBlur={commit}
                  className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
              </label>
              <label className="text-sm">
                {t.promoPrice}
                <input type="number" min={1} value={Math.round(p.bundle_price_satang / 100)}
                  onChange={(e) => edit(p.id, { bundle_price_satang: Math.max(1, Number(e.target.value) || 1) * 100 })} onBlur={commit}
                  className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
              </label>
            </div>

            <div className="text-sm">{t.promoItems(p.item_ids.length)}</div>
            {cats.map((c) => {
              const list = items.filter((i) => i.category_id === c.id);
              if (list.length === 0) return null;
              const ticked = list.filter((i) => p.item_ids.includes(i.id)).length;
              return (
                // Opened where something is already ticked, so the deal's own
                // dishes are on show and the other fifteen categories are not.
                <details key={c.id} open={ticked > 0} className="rounded-xl bg-surface-2 px-3 py-2">
                  <summary className="text-sm cursor-pointer">
                    {pickName(lang, c.name_en, c.name_th)}{ticked > 0 && ` · ${ticked}`}
                  </summary>
                  <ul className="mt-2 grid grid-cols-2 gap-1">
                    {list.map((it) => (
                      <li key={it.id}>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={p.item_ids.includes(it.id)}
                            onChange={(e) => edit(p.id, {
                              item_ids: e.target.checked
                                ? [...p.item_ids, it.id]
                                : p.item_ids.filter((x) => x !== it.id),
                            }, true)}
                            className="h-4 w-4 accent-accent"
                          />
                          {it.name_en}
                        </label>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}

            <button onClick={() => void remove(p)} className="text-ink-3 text-xs underline">{t.promoDelete}</button>
          </div>
        );
      })}

      {!missing && <button onClick={() => void add()} className="btn-outline">{t.promoAdd}</button>}
      {err && <p className="text-accent text-sm">{err}</p>}
    </section>
  );
}
