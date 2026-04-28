/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Cloudflare Access endpoints must NEVER be cached (architecture AR8 / line 1028).
// Registered BEFORE precacheAndRoute so this listener fires first.
self.addEventListener("fetch", (event: FetchEvent) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/cdn-cgi/access/")) {
    event.respondWith(fetch(event.request));
  }
});

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.pathname.startsWith("/tasks"),
  new NetworkFirst({ cacheName: "tasks-api" }),
);

registerRoute(
  ({ request }) => ["font", "style", "script", "image"].includes(request.destination),
  new CacheFirst({ cacheName: "static-assets" }),
);
