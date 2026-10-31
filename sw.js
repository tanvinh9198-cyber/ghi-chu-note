// Service Worker — cho phép app chạy OFFLINE và ghim lên màn hình chính
const CACHE = 'ghichu-note-v2';
const ASSETS = [
  './note.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

// Cài đặt: tải trước các file cần thiết.
// Dùng mỗi file riêng (không addAll) để 1 file lỗi không làm hỏng cả bản cài.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(ASSETS.map(u =>
        c.add(new Request(u, {cache:'reload'})).catch(()=>{})
      ))
    ).then(() => self.skipWaiting())
  );
});

// Khi cập nhật bản mới: dọn cache cũ
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Lượt request: cache trước, mạng sau (fallback offline)
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // bỏ qua request khác origin (vd: analytics)
  if (new URL(req.url).origin !== location.origin) return;

  e.respondWith(
    caches.match(req).then(cached => {
      const fetched = fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(()=>{});
        }
        return res;
      }).catch(() => cached || caches.match('./note.html'));
      return cached || fetched;
    })
  );
});
