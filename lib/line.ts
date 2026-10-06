import 'server-only';

const ENDPOINT = 'https://api.line.me/v2/bot/message/push';

/** A failure says why in a form the admin page can word in its own language;
 *  `reason` stays as the English fallback for anything else reading this. */
export type PushFailure =
  | { code: 'no_token' }
  | { code: 'no_profile' }
  | { code: 'refused'; status: number; body: string }
  | { code: 'network'; message: string };

export type PushResult = { ok: true } | ({ ok: false; reason: string } & PushFailure);

export type CustomerJoin =
  | { line_user_id: string | null }
  | { line_user_id: string | null }[]
  | null
  | undefined;

// PostgREST returns an embedded to-one row as an object, but hands back an
// array whenever it cannot prove the relationship is to-one. Reading it as an
// object either way turns a perfectly good LINE id into undefined, and the
// order then looks to us like it has no customer at all.
export function lineIdOf(customers: CustomerJoin): string | null {
  const c = Array.isArray(customers) ? customers[0] : customers;
  return c?.line_user_id ?? null;
}

/** Deep link that reopens the order inside LINE, when the LIFF id is configured. */
export function orderLink(orderId: string): string | null {
  const liffId = process.env.LINE_LIFF_ID;
  return liffId ? `https://liff.line.me/${liffId}/order/${orderId}` : null;
}

export async function pushLine(toUserId: string | null | undefined, text: string): Promise<PushResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { ok: false, code: 'no_token', reason: 'LINE_CHANNEL_ACCESS_TOKEN is not set on this site.' };
  if (!toUserId) return { ok: false, code: 'no_profile', reason: 'This order has no LINE profile, so there is nobody to message. Phone the customer instead.' };

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ to: toUserId, messages: [{ type: 'text', text }] }),
    });
    // LINE answers 400/401 with a JSON body rather than throwing, so a failed
    // send looks identical to a successful one unless the status is checked.
    if (!res.ok) {
      const body = (await res.text().catch(() => '')).slice(0, 300);
      return {
        ok: false, code: 'refused', status: res.status, body,
        reason: `LINE refused the message (${res.status}). ${body}`,
      };
    }
    return { ok: true };
  } catch (e) {
    const message = (e as Error).message;
    return { ok: false, code: 'network', message, reason: message };
  }
}
