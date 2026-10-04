import Link from 'next/link';
import Image from 'next/image';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { baht } from '@/lib/money';
import { Nav } from '@/components/Nav';
import { OrderActions } from './actions-client';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();

  const { data: order } = await sb.from('orders').select('*').eq('id', id).single();
  if (!order) return <><Nav /><main className="p-6 text-ink-3">Not found.</main></>;

  const [{ data: items }, { data: delivery }, { data: slip }, { data: customer }] = await Promise.all([
    sb.from('order_items').select('*').eq('order_id', id).order('created_at'),
    sb.from('delivery_details').select('*').eq('order_id', id).maybeSingle(),
    sb.from('payment_slips').select('*').eq('order_id', id).maybeSingle(),
    order.customer_id ? sb.from('customers').select('*').eq('id', order.customer_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const itemIds = (items ?? []).map((i: { id: string }) => i.id);
  const { data: itemOptions } = itemIds.length
    ? await sb.from('order_item_options').select('*').in('order_item_id', itemIds)
    : { data: [] };

  let slipUrl: string | null = null;
  if (slip?.storage_path) {
    const admin = supabaseAdmin();
    const { data } = await admin.storage.from('slips').createSignedUrl(slip.storage_path, 60 * 10);
    slipUrl = data?.signedUrl ?? null;
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl p-4">
        <Link href="/orders" className="text-ink-3 text-sm">← Back</Link>
        <div className="flex justify-between items-baseline mt-2">
          <h1 className="serif text-2xl">#{order.short_code ?? order.id.slice(0, 6)}</h1>
          <span className="chip">{order.status}</span>
        </div>
        <p className="text-ink-3 text-sm">{new Date(order.created_at).toLocaleString('en-GB')}</p>

        <section className="card p-4 mt-3">
          <h2 className="serif text-base mb-2">Items</h2>
          <ul className="divide-y divide-rule">
            {(items ?? []).map((it: { id: string; name_snapshot: string; qty: number; line_total_satang: number; note: string | null }) => {
              const opts = (itemOptions ?? []).filter((o: { order_item_id: string }) => o.order_item_id === it.id);
              return (
                <li key={it.id} className="py-2">
                  <div className="flex justify-between">
                    <span>{it.qty}× {it.name_snapshot}</span>
                    <span>{baht(it.line_total_satang)}</span>
                  </div>
                  {opts.length > 0 && (
                    <ul className="text-ink-3 text-xs mt-1 pl-5 list-disc space-y-0.5">
                      {opts.map((o: { label: string; group_name: string }, i: number) => <li key={i}>{o.group_name}: {o.label}</li>)}
                    </ul>
                  )}
                  {it.note && <div className="text-ink-3 text-xs italic mt-1 pl-5">“{it.note}”</div>}
                </li>
              );
            })}
          </ul>
          <div className="flex justify-between pt-3 border-t border-rule mt-2 font-medium">
            <span>Total</span>
            <span>{baht(order.total_satang)}</span>
          </div>
        </section>

        <section className="card p-4 mt-3">
          <h2 className="serif text-base mb-2">Fulfilment</h2>
          {order.fulfilment_mode === 'pickup' ? (
            <p className="text-sm">Pickup at the shop.</p>
          ) : delivery ? (
            <div className="text-sm space-y-1">
              <div>Delivery to <strong>{delivery.area_slug === 'rwbk' ? 'ซอยราชวินิตบางแก้ว' : 'หมู่บ้านนันทวัน บางนา กม 7'}</strong></div>
              <div className="whitespace-pre-wrap">{delivery.address}</div>
              <div className="text-ink-2">{delivery.contact_name} · {delivery.contact_phone}</div>
            </div>
          ) : <p className="text-ink-3 text-sm">(no delivery details)</p>}
          {customer?.display_name && <p className="text-ink-3 text-xs mt-2">LINE: {customer.display_name}</p>}
        </section>

        <section className="card p-4 mt-3">
          <h2 className="serif text-base mb-2">Payment slip</h2>
          {slipUrl ? (
            <a href={slipUrl} target="_blank" rel="noreferrer" className="block">
              <Image src={slipUrl} alt="slip" width={500} height={700} className="rounded-xl border border-rule" unoptimized />
            </a>
          ) : <p className="text-ink-3 text-sm">(not uploaded)</p>}
        </section>

        <OrderActions orderId={order.id} status={order.status} prepMinutes={order.prep_minutes} />
      </main>
    </>
  );
}
