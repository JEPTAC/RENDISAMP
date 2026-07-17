/* V11.40.2 · COOP bridge for Firebase/Google OAuth on GitHub Pages. */
const COOP_VALUE = "same-origin-allow-popups";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.mode !== "navigate" || request.method !== "GET") return;

  event.respondWith((async () => {
    const response = await fetch(request);
    const headers = new Headers(response.headers);
    headers.set("Cross-Origin-Opener-Policy", COOP_VALUE);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  })().catch(() => fetch(request)));
});
