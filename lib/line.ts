import 'server-only';

const ENDPOINT = 'https://api.line.me/v2/bot/message/push';

export type PushResult = { ok: true } | { ok: false; reason: string };

/** Deep link that reopens the order inside LINE, when the LIFF id is configured. */
export function orderLink(orderId: string): string | null {
  const liffId = process.env.LINE_LIFF_ID;
  return liffId ? `https://liff.line.me/${liffId}/order/${orderId}` : null;
}

export async function pushLine(toUserId: string | null | undefined, text: string): Promise<PushResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { ok: false, reason: 'LINE_CHANNEL_ACCESS_TOKEN is not set on this site.' };
  if (!toUserId) return { ok: false, reason: 'This order has no LINE profile, so there is nobody to message. Phone the customer instead.' };

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ to: toUserId, messages: [{ type: 'text', text }] }),
    });
    // LINE answers 400/401 with a JSON body rather than throwing, so a failed
    // send looks identical to a successful one unless the status is checked.
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, reason: `LINE refused the message (${res.status}). ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}
