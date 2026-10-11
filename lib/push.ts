'use client';
import { supabaseBrowser } from '@/lib/supabase-browser';

// The key a push service checks the shop's messages against. It is public by
// design: the matching private key lives on the ordering site's server.
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function keyBytes(base64: string): ArrayBuffer {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
  return buf;
}

function readKey(sub: PushSubscription, name: 'p256dh' | 'auth'): string {
  const buf = sub.getKey(name);
  if (!buf) return '';
  let s = '';
  new Uint8Array(buf).forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s);
}

/**
 * Registers this device to be rung when an order arrives, so the alert gets
 * through while the board is behind the till app or the screen is off.
 * Called once notifications have been allowed; safe to call again, since the
 * browser hands back the subscription it already has.
 */
export async function enablePush(): Promise<boolean> {
  try {
    if (!PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    if (Notification.permission !== 'granted') return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription()
      ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) });
    const p256dh = readKey(sub, 'p256dh');
    const auth = readKey(sub, 'auth');
    if (!p256dh || !auth) return false;
    const { error } = await supabaseBrowser().from('push_subscriptions').upsert({
      endpoint: sub.endpoint,
      p256dh,
      auth,
      label: navigator.userAgent.slice(0, 120),
    }, { onConflict: 'endpoint' });
    return !error;
  } catch {
    return false;
  }
}

/** Whether this device is already registered for background alerts. */
export async function pushState(): Promise<'on' | 'off' | 'unsupported'> {
  try {
    if (!PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === 'granted' ? 'on' : 'off';
  } catch {
    return 'unsupported';
  }
}
