console.log("Registering dummy worker");
self.addEventListener("activate", e => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener("install", e => {
  self.skipWaiting();
});
