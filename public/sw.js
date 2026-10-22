// LocalDoor の通知（事業者）。サーバーからのプッシュを受けて、音つきの通知を出す。押すとその画面を開く
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { title: 'LocalDoor', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(d.title || 'LocalDoor', {
      body: d.body || '',
      tag: d.tag || 'localdoor',
      renotify: true, // 同じ tag でも、もう一度鳴らす
      requireInteraction: true, // 押すまで消えない
      silent: false,
      vibrate: [200, 100, 200, 100, 400],
      icon: '/icon-512.png',
      badge: '/icon-512.png',
      data: { url: d.url || '/biz' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/biz', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && 'focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
