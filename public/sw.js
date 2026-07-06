// Service Worker do Adestro
// Estratégia: stale-while-revalidate para assets, network-first para HTML,
// cache-first para imagens. Inclui handler de push para notificações Web Push.

const CACHE_VERSION = "adestro-v5";
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
// App é multi-perfil: NÃO pré-cachear páginas de um perfil só (ex.: /dashboard é
// só-trainer). Pré-cacheamos apenas assets neutros + a página neutra de offline,
// que é o fallback universal de navegação. Cada página de perfil é cacheada
// sob demanda na primeira visita bem-sucedida (handler de navigate abaixo).
const OFFLINE_FALLBACK = "/offline.html";
const APP_SHELL = [OFFLINE_FALLBACK, "/icon.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(RUNTIME_CACHE).then((cache) =>
      cache
        .addAll(APP_SHELL.map((p) => new Request(p, { cache: "reload" })))
        .catch(() => undefined),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // APIs: sempre rede (sem cache).
  if (url.pathname.startsWith("/api/")) return;

  if (request.destination === "image") {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return cached || Response.error();
        }
      }),
    );
    return;
  }

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cache = await caches.open(RUNTIME_CACHE);
          // 1) A própria rota, se já foi visitada antes (cache por-URL).
          const cached = await cache.match(request);
          if (cached) return cached;
          // 2) Fallback NEUTRO. Nunca cair numa página de perfil específico:
          //    servir /dashboard aqui derrubava admin/cliente em "perfil sem
          //    permissão" (guard role="trainer"). offline.html é seguro p/ todos.
          const fallback = await cache.match(OFFLINE_FALLBACK);
          return fallback || Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const networkPromise = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || networkPromise;
    }),
  );
});

// Web Push — recebe payload do servidor e cria notificação local.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Adestro", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Adestro";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "adestro",
    data: { url: data.url || "/dashboard" },
    requireInteraction: Boolean(data.requireInteraction),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
