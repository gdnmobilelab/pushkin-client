/*
    It is possible to have multiple service worker registrations on one domain,
    but there is only one IndexedDB store per domain. So we need to ensure that
    our database is scoped correctly for the current registration. If this code
    is executing in a client view and doesn't have an active service worker, we
    throw an error, because we don't know what the registration should be.
*/
import * as tslib_1 from "tslib";
export function getRegistration() {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var registration;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(typeof "ServiceWorkerGlobalScope" !== "undefined" && self instanceof ServiceWorkerGlobalScope)) return [3 /*break*/, 1];
                    return [2 /*return*/, self.registration];
                case 1:
                    if (!(typeof "Window" !== "undefined" && self instanceof Window)) return [3 /*break*/, 3];
                    return [4 /*yield*/, self.navigator.serviceWorker.getRegistration()];
                case 2:
                    registration = _a.sent();
                    if (!registration) {
                        throw new Error("Cannot use pushkin-client without an active service worker");
                    }
                    return [2 /*return*/, registration];
                case 3: throw new Error("Running pushkin-client in an unknown environment");
            }
        });
    });
}
export function getRegistrationPrefix() {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var baseURL, parsedOut;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getRegistration()];
                case 1:
                    baseURL = _a.sent();
                    parsedOut = new URL(baseURL.scope);
                    return [2 /*return*/, parsedOut.pathname];
            }
        });
    });
}
//# sourceMappingURL=registration.js.map