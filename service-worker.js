
const cacheName = "noor-cache-v1";
const assetsToCache = [
  "./",
  "./index.html",
  "./noor.js",
  "./manifest.json",
  "./knowledge.txt",
  "./icon192.png",
  "./icon512.png"
];

// تثبيت السرفس ووركر وتخزين الملفات
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(assetsToCache);
    })
  );
});

// تفعيل الكاش القديم وحذف أي إصدار قديم
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== cacheName).map(key => caches.delete(key))
      );
    })
  );
});

// التعامل مع الطلبات (Offline-first)
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});


---

📂 إضافة التسجيل في noor.js أو في <script> داخل index.html

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./service-worker.js")
    .then(() => console.log("✅ Service Worker مسجّل بنجاح"))
    .catch(err => console.log("❌ فشل تسجيل Service Worker:", err));
}
