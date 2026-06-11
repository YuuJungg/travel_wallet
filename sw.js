/* 얼마지 서비스워커 — 오프라인 작동 + 온라인이면 자동 최신화.
   앱 파일을 바꾸면 아래 CACHE 버전을 올려라(예: v2 → v3). */
const CACHE = "eolmaji-v2";

// 앱을 이루는 핵심 파일 (상대 경로 — GitHub Pages 하위 경로에서도 동작)
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

// 설치: 핵심 파일 미리 캐시 + 즉시 활성화 대기
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

// 활성화: 예전 버전 캐시 정리 후 즉시 제어권 획득
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 페이지(앱 화면) 요청은 네트워크 우선 → 온라인이면 항상 최신, 오프라인이면 캐시
function isNavigation(req) {
  return req.mode === "navigate" ||
    (req.method === "GET" && req.headers.get("accept")?.includes("text/html"));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // 1) 앱 화면(HTML): 네트워크 우선, 실패하면 캐시
  if (isNavigation(req)) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok && new URL(req.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((c) => c || caches.match("./index.html"))
        )
    );
    return;
  }

  // 2) 그 외 정적 파일(아이콘 등): 캐시 우선, 없으면 네트워크(받으면 캐시)
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.ok && new URL(req.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
