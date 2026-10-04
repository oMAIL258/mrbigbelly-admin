'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const REJECT_REASONS = [
  'Payment could not be verified',
  'Out of stock',
  'Outside operating hours',
  'Delivery area not covered',
  'Other',
];

export function OrderActions({ orderId, status, prepMinutes }: { orderId: string; status: string; prepMinutes: number | null }) {
  const router = useRouter();
  const [prep, setPrep] = useState(prepMinutes ?? 15);
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function post(path: string, body?: object) {
    setBusy(true); setErr(null);
    const res = await fetch(`/api/orders/${orderId}/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (!res.ok) { setErr(await res.text()); return; }
    router.refresh();
  }

  if (status === 'done' || status === 'rejected') {
    return <p className="text-ink-3 text-sm text-center py-4">Order {status}.</p>;
  }

  return (
    <section className="card p-4 mt-3 space-y-4">
      <h2 className="serif text-base">Actions</h2>
      {err && <div className="text-accent text-sm">{err}</div>}

      {status === 'new' && (
        <>
          <div>
            <label className="text-sm text-ink-2">Prep time (minutes)</label>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setPrep((p) => Math.max(5, p - 5))} className="btn-outline">−5</button>
              <input type="number" value={prep} onChange={(e) => setPrep(Number(e.target.value) || 0)}
                className="w-20 rounded-xl border border-rule p-2 text-center" />
              <button onClick={() => setPrep((p) => p + 5)} className="btn-outline">+5</button>
            </div>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => post('confirm', { prep_minutes: prep })} className="btn-primary flex-1">
              Confirm & start
            </button>
          </div>
          <details className="pt-2 border-t border-rule">
            <summary className="text-ink-3 text-sm cursor-pointer">Reject order…</summary>
            <div className="mt-2 space-y-2">
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-rule p-2 text-sm">
                {REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
              <button disabled={busy} onClick={() => post('reject', { reason })} className="btn-outline w-full border-accent text-accent">
                Reject
              </button>
            </div>
          </details>
        </>
      )}

      {status === 'confirmed' && (
        <button disabled={busy} onClick={() => post('move', { to: 'ready' })} className="btn-primary w-full">
          Mark ready
        </button>
      )}
      {status === 'ready' && (
        <button disabled={busy} onClick={() => post('move', { to: 'done' })} className="btn-primary w-full">
          Mark picked up / delivered
        </button>
      )}
    </section>
  );
}
