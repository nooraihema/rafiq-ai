
const cacheName = "noor-cache-v1";
const assetsToCache = [
  "./",
  "index.html",
  "noor.js",
  "manifest.json",
  "knowledge.txt"
];

// تثبيت السرفس ووركر وتخزين الملفات
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(assetsToCache);
    })
  );
});

// تفعيل الكاش القديم
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== cacheName).map(key => caches.delete(key))
      );
    })
  );
});

// التعامل مع الطلبات
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});


