// Service Worker — OFFLINE + ghim lên màn hình chính
const CACHE = 'ghichu-note-v3';

// App shell: lấy mạng trước, mất mạng mới dùng bản cache
const SHELL = ['./note.html', './manifest.webmanifest'];
// File tĩnh ít đổi: cache trước (icon)
const STATIC = [
  './icon-192.png', './icon-512.png',
  './icon-maskable-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all([...SHELL, ...STATIC].map(u =>
        c.add(new Request(u, {cache:'reload'})).catch(()=>{})
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;

  // App shell: NETWORK FIRST — để cập nhật app tới được người dùng
  if (SHELL.some(u => req.url.endsWith(u.replace('./','')))) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(()=>{});
        }
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./note.html')))
    );
    return;
  }

  // File tĩnh: CACHE FIRST — icon ít đổi, giữ cho nhanh
  if (STATIC.some(u => req.url.endsWith(u.replace('./','')))) {
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(()=>{});
        }
        return res;
      }))
    );
    return;
  }

  // Các file khác: cache trước, mạng sau
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).catch(() => caches.match('./note.html')))
  );
});
