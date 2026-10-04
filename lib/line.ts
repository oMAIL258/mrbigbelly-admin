import 'server-only';

const ENDPOINT = 'https://api.line.me/v2/bot/message/push';

export async function pushLine(toUserId: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !toUserId) return;
  await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ to: toUserId, messages: [{ type: 'text', text }] }),
  }).catch((e) => console.warn('LINE push failed', e));
}
