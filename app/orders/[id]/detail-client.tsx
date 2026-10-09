'use client';
import Link from 'next/link';
import Image from 'next/image';
import { baht } from '@/lib/money';
import { useLang, statusLabel } from '@/lib/i18n';
import { OrderActions } from './actions-client';

export type DetailItem = {
  id: string;
  name_snapshot: string;
  qty: number;
  line_total_satang: number;
  note: string | null;
  options: { group_name: string; label: string }[];
};

export type Detail = {
  id: string;
  short_code: string | null;
  status: string;
  created_at: string;
  subtotal_satang: number;
  discount_satang: number;
  discount_title_th: string | null;
  discount_title_en: string | null;
  total_satang: number;
  fulfilment_mode: 'pickup' | 'delivery';
  prep_minutes: number | null;
  items: DetailItem[];
  delivery: { area_slug: string; address: string; contact_name: string; contact_phone: string } | null;
  slipUrl: string | null;
  customer: { line_user_id: string | null; display_name: string | null } | null;
};

const AREA_NAMES: Record<string, string> = {
  rwbk: 'ซอยราชวินิตบางแก้ว',
  ntw7: 'หมู่บ้านนันทวัน บางนา กม 7',
};

export function OrderDetail({ order }: { order: Detail }) {
  const { lang, t } = useLang();

  return (
    <main className="mx-auto max-w-3xl p-4">
      <Link href="/orders" className="text-ink-3 text-sm">{t.back}</Link>
      <div className="flex justify-between items-baseline mt-2">
        <h1 className="serif text-2xl">#{order.short_code ?? order.id.slice(0, 6)}</h1>
        <span className="chip">{statusLabel(t, order.status)}</span>
      </div>
      <p className="text-ink-3 text-sm">
        {new Date(order.created_at).toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', { timeZone: 'Asia/Bangkok' })}
      </p>

      <section className="card p-4 mt-3">
        <h2 className="serif text-base mb-2">{t.items}</h2>
        <ul className="divide-y divide-rule">
          {order.items.map((it) => (
            <li key={it.id} className="py-2">
              <div className="flex justify-between">
                <span>{it.qty}× {it.name_snapshot}</span>
                <span>{baht(it.line_total_satang)}</span>
              </div>
              {it.options.length > 0 && (
                <ul className="text-ink-3 text-xs mt-1 pl-5 list-disc space-y-0.5">
                  {it.options.map((o, i) => <li key={i}>{o.group_name}: {o.label}</li>)}
                </ul>
              )}
              {it.note && <div className="text-ink-3 text-xs italic mt-1 pl-5">“{it.note}”</div>}
            </li>
          ))}
        </ul>
        {order.discount_satang > 0 && (
          <>
            <div className="flex justify-between pt-3 border-t border-rule mt-2 text-sm">
              <span className="text-ink-2">{t.subtotal}</span>
              <span>{baht(order.subtotal_satang)}</span>
            </div>
            <div className="flex justify-between text-sm text-veg">
              <span>{(lang === 'th' ? order.discount_title_th : order.discount_title_en) ?? t.rewardDiscount}</span>
              <span>−{baht(order.discount_satang)}</span>
            </div>
          </>
        )}
        <div className={`flex justify-between font-medium ${order.discount_satang > 0 ? 'mt-1' : 'pt-3 border-t border-rule mt-2'}`}>
          <span>{order.discount_satang > 0 ? t.paid : t.total}</span>
          <span>{baht(order.total_satang)}</span>
        </div>
      </section>

      <section className="card p-4 mt-3">
        <h2 className="serif text-base mb-2">{t.fulfilment}</h2>
        {order.fulfilment_mode === 'pickup' ? (
          <p className="text-sm">{t.pickupAtShop}</p>
        ) : order.delivery ? (
          <div className="text-sm space-y-1">
            <div>{t.deliverTo} <strong>{AREA_NAMES[order.delivery.area_slug] ?? order.delivery.area_slug}</strong></div>
            <div className="whitespace-pre-wrap">{order.delivery.address}</div>
            <div className="text-ink-2">{order.delivery.contact_name} · {order.delivery.contact_phone}</div>
          </div>
        ) : <p className="text-ink-3 text-sm">{t.noDeliveryDetails}</p>}
        {order.customer?.line_user_id ? (
          <p className="text-ink-3 text-xs mt-2">{t.lineAuto(order.customer.display_name ?? t.lineLinked)}</p>
        ) : (
          <p className="text-accent text-xs mt-2">{t.noLineContact}</p>
        )}
      </section>

      <section className="card p-4 mt-3">
        <h2 className="serif text-base mb-2">{t.paymentSlip}</h2>
        {order.slipUrl ? (
          <a href={order.slipUrl} target="_blank" rel="noreferrer" className="block">
            <Image src={order.slipUrl} alt="" width={500} height={700} className="rounded-xl border border-rule" unoptimized />
          </a>
        ) : <p className="text-ink-3 text-sm">{t.notUploaded}</p>}
      </section>

      <OrderActions orderId={order.id} status={order.status} prepMinutes={order.prep_minutes} />
    </main>
  );
}
