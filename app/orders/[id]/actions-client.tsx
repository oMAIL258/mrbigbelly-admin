'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang, statusLabel } from '@/lib/i18n';

// The code travels, not the wording: the shop may be reading Thai while the
// customer is reading English, and the message that goes out has to carry both.
const REJECT_CODES = ['payment', 'stock', 'hours', 'area', 'other'] as const;

export function OrderActions({ orderId, status, prepMinutes }: { orderId: string; status: string; prepMinutes: number | null }) {
  const router = useRouter();
  const { t } = useLang();
  const [prep, setPrep] = useState(prepMinutes ?? 15);
  const [code, setCode] = useState<string>(REJECT_CODES[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pushWarning, setPushWarning] = useState<string | null>(null);

  type Failure =
    | { code: 'no_token' }
    | { code: 'no_profile' }
    | { code: 'refused'; status: number; body: string }
    | { code: 'network'; message: string };

  const failureText = (f: Partial<Failure> & { reason?: string }) =>
    f.code === 'no_token' ? t.tokenMissing
    : f.code === 'no_profile' ? t.noLineProfile
    : f.code === 'refused' ? t.lineRefused(f.status ?? 0, f.body ?? '')
    : f.code === 'network' ? t.lineUnreachable(f.message ?? '')
    : f.reason ?? t.pushFailed;

  const reasonLabel = (c: string) =>
    c === 'payment' ? t.rrPayment
    : c === 'stock' ? t.rrStock
    : c === 'hours' ? t.rrHours
    : c === 'area' ? t.rrArea
    : t.rrOther;

  async function post(path: string, body?: object) {
    setBusy(true); setErr(null); setPushWarning(null);
    const res = await fetch(`/api/orders/${orderId}/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (!res.ok) { setErr(await res.text()); return; }
    const data = (await res.json()) as { push?: { ok: boolean } & Partial<Failure> & { reason?: string } };
    if (data.push && !data.push.ok) setPushWarning(failureText(data.push));
    router.refresh();
  }

  const warning = pushWarning && (
    <div className="card border-accent p-3 text-sm">
      <strong className="text-accent">{t.notNotified}</strong>
      <div className="text-ink-2 mt-1">{pushWarning}</div>
      <div className="text-ink-3 text-xs mt-1">{t.statusSaved}</div>
    </div>
  );

  if (status === 'done' || status === 'rejected') {
    return (
      <section className="mt-3 space-y-3">
        {warning}
        <p className="text-ink-3 text-sm text-center py-4">{t.orderIs(statusLabel(t, status))}</p>
      </section>
    );
  }

  return (
    <section className="card p-4 mt-3 space-y-4">
      <h2 className="serif text-base">{t.actions}</h2>
      {err && <div className="text-accent text-sm">{err}</div>}
      {warning}

      {status === 'new' && (
        <>
          <div>
            <label className="text-sm text-ink-2">{t.prepMinutes}</label>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setPrep((p) => Math.max(5, p - 5))} className="btn-outline">−5</button>
              <input type="number" value={prep} onChange={(e) => setPrep(Number(e.target.value) || 0)}
                className="w-20 rounded-xl border border-rule p-2 text-center" />
              <button onClick={() => setPrep((p) => p + 5)} className="btn-outline">+5</button>
            </div>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => post('confirm', { prep_minutes: prep })} className="btn-primary flex-1">
              {t.confirmStart}
            </button>
          </div>
          <details className="pt-2 border-t border-rule">
            <summary className="text-ink-3 text-sm cursor-pointer">{t.rejectOrder}</summary>
            <div className="mt-2 space-y-2">
              <select value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-xl border border-rule p-2 text-sm">
                {REJECT_CODES.map((c) => <option key={c} value={c}>{reasonLabel(c)}</option>)}
              </select>
              <button disabled={busy} onClick={() => post('reject', { reason_code: code })} className="btn-outline w-full border-accent text-accent">
                {t.reject}
              </button>
            </div>
          </details>
        </>
      )}

      {status === 'confirmed' && (
        <button disabled={busy} onClick={() => post('move', { to: 'ready' })} className="btn-primary w-full">
          {t.markReady}
        </button>
      )}
      {status === 'ready' && (
        <button disabled={busy} onClick={() => post('move', { to: 'done' })} className="btn-primary w-full">
          {t.markDone}
        </button>
      )}
    </section>
  );
}
