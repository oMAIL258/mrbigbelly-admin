// Android Chrome only shows a system notification through a service worker
// (`new Notification()` throws there), so this worker exists to show them and
// to bring the board forward when one is tapped. It caches nothing on purpose:
// a stale order board is worse than no board.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// An order arriving while the board is closed, behind the till app, or with
// the screen off. Android wakes this worker, and the notification it shows is
// the shop's only sign that something is waiting.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'ออเดอร์ใหม่ / New order', {
    body: d.body || '',
    tag: 'mbb-order',
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 120, 300, 120, 300],
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: d.url || '/orders' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/orders';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = wins.find((w) => new URL(w.url).origin === self.location.origin);
    if (open) { await open.focus(); if ('navigate' in open) await open.navigate(url); return; }
    await self.clients.openWindow(url);
  })());
});
