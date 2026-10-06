import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { Nav } from '@/components/Nav';
import { NotFound } from './not-found-client';
import { OrderDetail, type Detail, type DetailItem } from './detail-client';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();

  const { data: order } = await sb.from('orders').select('*').eq('id', id).single();
  if (!order) return <><Nav /><NotFound /></>;

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

  type Row = { id: string; name_snapshot: string; qty: number; line_total_satang: number; note: string | null };
  type Opt = { order_item_id: string; group_name: string; label: string };

  const detail: Detail = {
    id: order.id,
    short_code: order.short_code,
    status: order.status,
    created_at: order.created_at,
    total_satang: order.total_satang,
    fulfilment_mode: order.fulfilment_mode,
    prep_minutes: order.prep_minutes,
    items: ((items ?? []) as Row[]).map((it): DetailItem => ({
      id: it.id,
      name_snapshot: it.name_snapshot,
      qty: it.qty,
      line_total_satang: it.line_total_satang,
      note: it.note,
      options: ((itemOptions ?? []) as Opt[])
        .filter((o) => o.order_item_id === it.id)
        .map(({ group_name, label }) => ({ group_name, label })),
    })),
    delivery: delivery
      ? {
          area_slug: delivery.area_slug,
          address: delivery.address,
          contact_name: delivery.contact_name,
          contact_phone: delivery.contact_phone,
        }
      : null,
    slipUrl,
    customer: customer
      ? { line_user_id: customer.line_user_id ?? null, display_name: customer.display_name ?? null }
      : null,
  };

  return <><Nav /><OrderDetail order={detail} /></>;
}
