// Android Chrome only shows a system notification through a service worker
// (`new Notification()` throws there), so this worker exists to show them and
// to bring the board forward when one is tapped. It caches nothing on purpose:
// a stale order board is worse than no board.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

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
