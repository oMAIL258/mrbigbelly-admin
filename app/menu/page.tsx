'use client';
import { useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { baht } from '@/lib/money';
import { Nav } from '@/components/Nav';
import { useLang, pickName } from '@/lib/i18n';
import { shrinkImage } from '@/lib/shrink';

type Item = {
  id: string; name_en: string; name_th: string | null;
  price_satang: number; is_available: boolean; category_id: string; photo_url: string | null;
  bonus_points: number;
};
type Cat = { id: string; name_en: string; name_th: string | null; sort: number };

export default function MenuAdminPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { lang, t } = useLang();

  async function load() {
    const sb = supabaseBrowser();
    const [c, i] = await Promise.all([
      sb.from('categories').select('id, name_en, name_th, sort').order('sort'),
      sb.from('menu_items').select('id, name_en, name_th, price_satang, is_available, category_id, photo_url, bonus_points').order('sort'),
    ]);
    if (c.data) setCats(c.data as Cat[]);
    if (i.data) setItems(i.data as Item[]);
  }
  useEffect(() => { load(); }, []);

  async function toggle(it: Item) {
    setBusy(it.id); setErr(null);
    const { error } = await supabaseBrowser().from('menu_items').update({ is_available: !it.is_available }).eq('id', it.id);
    if (error) setErr(error.message); else await load();
    setBusy(null);
  }

  async function uploadPhoto(it: Item, file: File) {
    setBusy(it.id); setErr(null);
    try {
      const sb = supabaseBrowser();
      // Shrunk here rather than sent as it came off the phone; see lib/shrink.
      const { blob, contentType, ext } = await shrinkImage(file);
      const path = `${it.id}/${Date.now()}.${ext}`;
      const up = await sb.storage.from('menu-photos').upload(path, blob, { contentType, upsert: true });
      if (up.error) throw up.error;
      const { data } = sb.storage.from('menu-photos').getPublicUrl(up.data.path);
      const { error } = await sb.from('menu_items').update({ photo_url: data.publicUrl }).eq('id', it.id);
      if (error) throw error;
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(null);
  }

  async function setBonus(it: Item, bonus_points: number) {
    setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, bonus_points } : x)));
    const { error } = await supabaseBrowser().from('menu_items').update({ bonus_points }).eq('id', it.id);
    if (error) setErr(error.message);
  }

  async function removePhoto(it: Item) {
    setBusy(it.id); setErr(null);
    const { error } = await supabaseBrowser().from('menu_items').update({ photo_url: null }).eq('id', it.id);
    if (error) setErr(error.message); else await load();
    setBusy(null);
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl p-4">
        <h1 className="serif text-xl mb-1">{t.menu}</h1>
        <p className="text-ink-3 text-sm mb-4">{t.menuNote}</p>
        {err && <div className="card border-accent p-3 mb-3 text-sm text-accent">{err}</div>}

        {cats.map((c) => {
          const list = items.filter((i) => i.category_id === c.id);
          if (list.length === 0) return null;
          return (
            <section key={c.id} className="mb-5">
              <h2 className="serif text-base mb-2">{pickName(lang, c.name_en, c.name_th)}</h2>
              <ul className="card divide-y divide-rule">
                {list.map((it) => (
                  <MenuRow
                    key={it.id}
                    item={it}
                    busy={busy === it.id}
                    onToggle={() => toggle(it)}
                    onUpload={(f) => uploadPhoto(it, f)}
                    onRemovePhoto={() => removePhoto(it)}
                    onBonus={(n) => setBonus(it, n)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </main>
    </>
  );
}

function MenuRow({ item, busy, onToggle, onUpload, onRemovePhoto, onBonus }: {
  item: Item; busy: boolean;
  onToggle: () => void; onUpload: (f: File) => void; onRemovePhoto: () => void;
  onBonus: (n: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { t } = useLang();
  return (
    <li className="p-3 flex items-center gap-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        title={item.photo_url ? t.replacePhoto : t.addPhoto}
        className="h-14 w-14 shrink-0 rounded-xl border border-rule overflow-hidden bg-surface-2 text-ink-3 text-xs"
      >
        {item.photo_url
          ? <img src={item.photo_url} alt="" className="h-full w-full object-cover" />
          : <span>{t.addPhotoShort}</span>}
      </button>

      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{item.name_en}</div>
        {item.name_th && <div className="text-ink-3 text-xs truncate">{item.name_th}</div>}
        {item.photo_url && (
          <button onClick={onRemovePhoto} disabled={busy} className="text-ink-3 text-xs underline mt-1">
            {t.removePhoto}
          </button>
        )}
      </div>

      <label className="text-right shrink-0" title={t.bonusHint}>
        <span className="block text-ink-3 text-[11px]">{t.bonusPoints}</span>
        <input
          type="number"
          value={item.bonus_points ?? 0}
          onChange={(e) => onBonus(Math.max(0, Number(e.target.value) || 0))}
          className={`w-16 rounded-xl border p-1 text-sm text-center ${
            item.bonus_points > 0 ? 'border-gold text-gold font-medium' : 'border-rule'
          }`}
        />
      </label>

      <div className="text-sm text-ink-2 whitespace-nowrap">{baht(item.price_satang)}</div>
      <button
        disabled={busy}
        onClick={onToggle}
        className={`btn whitespace-nowrap ${item.is_available ? 'bg-white border border-rule' : 'bg-accent text-white'}`}
      >
        {busy ? '…' : item.is_available ? t.available : t.soldOut}
      </button>
    </li>
  );
}
