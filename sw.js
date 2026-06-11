/* 얼마지 서비스워커 — 오프라인 작동용 캐시.
   앱 파일을 바꾸면 아래 CACHE 버전을 올려라(예: v2 → v3). */
const CACHE = "eolmaji-v1";

// 앱을 이루는 핵심 파일 (상대 경로 — GitHub Pages 하위 경로에서도 동작)
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

// 설치: 핵심 파일 미리 캐시
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

// 활성화: 예전 버전 캐시 정리
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 요청 처리: 캐시 우선, 없으면 네트워크(받으면 캐시에 보관)
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // 같은 출처 응답만 캐시에 추가 (폰트 등 교차출처는 그대로 통과)
          if (res && res.ok && new URL(req.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached); // 오프라인 + 미캐시면 실패 그대로
    })
  );
});
