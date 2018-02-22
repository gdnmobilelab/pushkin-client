/*
    It is possible to have multiple service worker registrations on one domain,
    but there is only one IndexedDB store per domain. So we need to ensure that
    our database is scoped correctly for the current registration. If this code
    is executing in a client view and doesn't have an active service worker, we
    throw an error, because we don't know what the registration should be.
*/

declare class ServiceWorkerGlobalScope {
  registration: ServiceWorkerRegistration;
}

export async function getRegistration() {
  if (typeof ServiceWorkerGlobalScope !== "undefined" && self instanceof ServiceWorkerGlobalScope) {
    return self.registration;
  } else if (typeof Window !== "undefined" && self instanceof Window) {
    let registration = await self.navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error("Cannot use pushkin-client without an active service worker");
    }
    return registration;
  } else {
    throw new Error("Running pushkin-client in an unknown environment");
  }
}

export async function getRegistrationPrefix() {
  let baseURL = await getRegistration();
  let parsedOut = new URL(baseURL.scope);
  return parsedOut.pathname;
}
