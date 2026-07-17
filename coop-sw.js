/* V11.40.5 — desactivador del service worker COOP experimental. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    await self.registration.unregister();
    const windows = await self.clients.matchAll({type:"window", includeUncontrolled:true});
    for (const client of windows) {
      try { await client.navigate(client.url); } catch (_) {}
    }
  })());
});
