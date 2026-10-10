'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Nav } from '@/components/Nav';
import { useLang } from '@/lib/i18n';
import { shrinkImage } from '@/lib/shrink';

type Reward = {
  id: string;
  title_th: string; title_en: string;
  detail_th: string | null; detail_en: string | null;
  photo_url: string | null;
  points_cost: number;
  discount_satang: number | null;
  stock: number | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort: number;
};

type Draft = Omit<Reward, 'id' | 'sort'> & { id?: string };

const blank: Draft = {
  title_th: '', title_en: '', detail_th: '', detail_en: '',
  photo_url: null, points_cost: 5, discount_satang: 2000, stock: null, is_active: true,
  starts_at: null, ends_at: null,
};

export default function RewardsAdminPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { lang, t } = useLang();

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().from('rewards').select('*').order('sort').order('created_at');
    setRewards((data ?? []) as Reward[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!draft) return;
    if (!draft.title_th.trim() && !draft.title_en.trim()) return;
    setBusy(true); setErr(null);
    const sb = supabaseBrowser();
    // One name is enough to type: the other falls back to it rather than
    // leaving a customer looking at an empty card.
    const row = {
      title_th: draft.title_th.trim() || draft.title_en.trim(),
      title_en: draft.title_en.trim() || draft.title_th.trim(),
      detail_th: draft.detail_th?.trim() || null,
      detail_en: draft.detail_en?.trim() || null,
      photo_url: draft.photo_url,
      points_cost: Math.max(1, Math.round(draft.points_cost || 1)),
      // A discount of zero or nothing is a reward to collect, not money off.
      discount_satang: draft.discount_satang && draft.discount_satang > 0
        ? Math.round(draft.discount_satang)
        : null,
      stock: draft.stock === null || Number.isNaN(draft.stock) ? null : Math.max(0, Math.round(draft.stock)),
      is_active: draft.is_active,
      starts_at: draft.starts_at || null,
      ends_at: draft.ends_at || null,
    };
    const res = draft.id
      ? await sb.from('rewards').update(row).eq('id', draft.id)
      : await sb.from('rewards').insert(row);
    setBusy(false);
    if (res.error) { setErr(res.error.message); return; }
    setDraft(null);
    await load();
  }

  async function remove(id: string) {
    if (!window.confirm(t.confirmDelete)) return;
    const { error } = await supabaseBrowser().from('rewards').delete().eq('id', id);
    // A reward somebody already claimed is referenced by that claim, so it is
    // retired rather than deleted and the history stays readable.
    if (error) await supabaseBrowser().from('rewards').update({ is_active: false }).eq('id', id);
    await load();
  }

  async function uploadPhoto(file: File) {
    if (!draft) return;
    setBusy(true); setErr(null);
    try {
      const sb = supabaseBrowser();
      // Shrunk here rather than sent as it came off the phone; see lib/shrink.
      const { blob, contentType, ext } = await shrinkImage(file);
      const path = `${draft.id ?? 'new'}/${Date.now()}.${ext}`;
      const up = await sb.storage.from('reward-photos').upload(path, blob, { contentType, upsert: true });
      if (up.error) throw up.error;
      const { data } = sb.storage.from('reward-photos').getPublicUrl(up.data.path);
      setDraft({ ...draft, photo_url: data.publicUrl });
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="serif text-xl">{t.rewardsTab}</h1>
          <button onClick={() => setDraft({ ...blank })} className="btn-primary">+ {t.newReward}</button>
        </div>

        {draft && (
          <RewardForm
            draft={draft}
            busy={busy}
            err={err}
            onChange={setDraft}
            onUpload={uploadPhoto}
            onCancel={() => { setDraft(null); setErr(null); }}
            onSave={save}
          />
        )}

        {loading && <p className="text-ink-3 text-sm text-center py-10">{t.loading}</p>}
        {!loading && rewards.length === 0 && !draft && (
          <p className="text-ink-3 text-sm text-center py-10">{t.noRewards}</p>
        )}

        <ul className="space-y-2 stagger">
          {rewards.map((r) => (
            <li key={r.id} className={`card p-3 flex items-center gap-3 ${r.is_active ? '' : 'opacity-60'}`}>
              <span className="h-16 w-16 shrink-0 rounded-xl border border-rule bg-surface-2 overflow-hidden">
                {r.photo_url && <img src={r.photo_url} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm truncate">{lang === 'th' ? r.title_th : r.title_en}</span>
                <span className="block text-ink-3 text-xs truncate">{lang === 'th' ? r.title_en : r.title_th}</span>
                <span className="block text-xs mt-1">
                  <span className="text-gold font-medium">{t.usePoints(r.points_cost)}</span>
                  {r.discount_satang ? (
                    <span className="text-veg font-medium">{' → '}{t.discountOff(r.discount_satang / 100)}</span>
                  ) : null}
                  <span className="text-ink-3">
                    {' · '}
                    {r.stock === null ? t.unlimited : r.stock === 0 ? t.outOfStock : t.nLeft(r.stock)}
                    {r.is_active ? '' : ` · ${t.soldOut}`}
                  </span>
                </span>
              </span>
              <button onClick={() => setDraft({ ...r })} className="btn-outline shrink-0">{t.editReward}</button>
              <button onClick={() => remove(r.id)} className="text-ink-3 text-xs underline shrink-0">
                {t.deleteReward}
              </button>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}

function RewardForm({ draft, busy, err, onChange, onUpload, onCancel, onSave }: {
  draft: Draft; busy: boolean; err: string | null;
  onChange: (d: Draft) => void; onUpload: (f: File) => void;
  onCancel: () => void; onSave: () => void;
}) {
  const { t } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });

  return (
    <section className="card p-4 space-y-3 rise">
      <h2 className="serif text-base">{draft.id ? t.editReward : t.newReward}</h2>

      <div className="flex gap-3">
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="h-24 w-24 shrink-0 rounded-xl border border-rule bg-surface-2 overflow-hidden text-ink-3 text-xs"
        >
          {draft.photo_url
            ? <img src={draft.photo_url} alt="" className="h-full w-full object-cover" />
            : <span>{busy ? '…' : t.photo}</span>}
        </button>
        <div className="flex-1 space-y-2">
          <input value={draft.title_th} onChange={(e) => set({ title_th: e.target.value })}
            placeholder={t.titleTh} className="w-full rounded-xl border border-rule p-2 text-sm" />
          <input value={draft.title_en} onChange={(e) => set({ title_en: e.target.value })}
            placeholder={t.titleEn} className="w-full rounded-xl border border-rule p-2 text-sm" />
        </div>
      </div>

      <textarea value={draft.detail_th ?? ''} onChange={(e) => set({ detail_th: e.target.value })}
        placeholder={t.detailTh} rows={2} className="w-full rounded-xl border border-rule p-2 text-sm" />
      <textarea value={draft.detail_en ?? ''} onChange={(e) => set({ detail_en: e.target.value })}
        placeholder={t.detailEn} rows={2} className="w-full rounded-xl border border-rule p-2 text-sm" />

      <div>
        <div className="text-sm text-ink-2">{t.rewardKind}</div>
        <div className="mt-1 flex gap-2">
          {([true, false] as const).map((isDiscount) => (
            <button
              key={String(isDiscount)}
              onClick={() => set({ discount_satang: isDiscount ? (draft.discount_satang ?? 2000) : null })}
              className={`rounded-full px-3 py-1.5 text-sm ${
                Boolean(draft.discount_satang) === isDiscount ? 'bg-accent text-white' : 'btn-outline'
              }`}
            >
              {isDiscount ? t.kindDiscount : t.kindThing}
            </button>
          ))}
        </div>
        <p className="text-ink-3 text-xs mt-1.5">
          {draft.discount_satang ? t.kindDiscountNote : t.kindThingNote}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          {t.pointsCost}
          <input type="number" value={draft.points_cost}
            onChange={(e) => set({ points_cost: Number(e.target.value) || 0 })}
            className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
        </label>
        {draft.discount_satang ? (
          <label className="text-sm">
            {t.discountBaht}
            <input type="number" value={Math.round(draft.discount_satang / 100)}
              onChange={(e) => set({ discount_satang: Math.max(1, Number(e.target.value) || 1) * 100 })}
              className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
          </label>
        ) : <span />}
        <label className="text-sm">
          {t.stock}
          <input type="number" value={draft.stock ?? ''} placeholder={t.stockHint}
            onChange={(e) => set({ stock: e.target.value === '' ? null : Number(e.target.value) })}
            className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
        </label>
        <label className="text-sm">
          {t.startsAt}
          <input type="date" value={draft.starts_at?.slice(0, 10) ?? ''}
            onChange={(e) => set({ starts_at: e.target.value ? `${e.target.value}T00:00:00+07:00` : null })}
            className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
        </label>
        <label className="text-sm">
          {t.endsAt}
          <input type="date" value={draft.ends_at?.slice(0, 10) ?? ''}
            onChange={(e) => set({ ends_at: e.target.value ? `${e.target.value}T23:59:59+07:00` : null })}
            className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={draft.is_active} onChange={(e) => set({ is_active: e.target.checked })}
          className="h-4 w-4 accent-accent" />
        {t.activeLabel}
      </label>

      {err && <div className="text-accent text-sm">{err}</div>}

      <div className="flex gap-2">
        <button onClick={onSave} disabled={busy} className="btn-primary flex-1 disabled:opacity-50">
          {busy ? t.saving : t.save}
        </button>
        <button onClick={onCancel} className="btn-outline">{t.back}</button>
      </div>
    </section>
  );
}
