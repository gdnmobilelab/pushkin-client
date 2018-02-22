import * as tslib_1 from "tslib";
import { getDatabase } from "./db";
import { key } from "./firebase_key";
import { getRegistration } from "./registration";
var config = {};
export function setConfig(cfg) {
    config.key = cfg.key;
    config.host = cfg.host;
}
function pushkinRequest(endpoint, method, body) {
    if (method === void 0) { method = "GET"; }
    if (body === void 0) { body = null; }
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var headers, response, text, json;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!config.key || !config.host) {
                        throw new Error("Must set config variables");
                    }
                    headers = new Headers();
                    headers.set("Authorization", config.key);
                    headers.set("Content-Type", "application/json");
                    return [4 /*yield*/, fetch(config.host + endpoint, {
                            method: method,
                            mode: "cors",
                            headers: headers,
                            body: body ? JSON.stringify(body) : null
                        })];
                case 1:
                    response = _a.sent();
                    if (!(!response.status || response.status < 200 || response.status > 299)) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2:
                    text = _a.sent();
                    throw new Error(text);
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    json = _a.sent();
                    if (json.errorMessage) {
                        throw new Error(json.errorMessage);
                    }
                    return [2 /*return*/, json];
            }
        });
    });
}
var DatabaseKeys;
(function (DatabaseKeys) {
    DatabaseKeys["SUBSCRIPTION_DATA"] = "subscription_data";
    DatabaseKeys["CACHED_SUBSCRIPTION_ID"] = "cached_subscription_id";
})(DatabaseKeys || (DatabaseKeys = {}));
function getDBStores() {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var db, _a;
        return tslib_1.__generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, getDatabase()];
                case 1:
                    db = _b.sent();
                    _a = {};
                    return [4 /*yield*/, db.store("config")];
                case 2:
                    _a.configStore = _b.sent();
                    return [4 /*yield*/, db.store("config")];
                case 3: return [2 /*return*/, (_a.subscriptionStore = _b.sent(),
                        _a)];
            }
        });
    });
}
function getAndCheckSubscription() {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var _a, configStore, subscriptionStore, storedConfig, registration, currentConfig, currentConfigStringified, definiteConfig;
        return tslib_1.__generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, getDBStores()];
                case 1:
                    _a = _b.sent(), configStore = _a.configStore, subscriptionStore = _a.subscriptionStore;
                    return [4 /*yield*/, configStore.get(DatabaseKeys.SUBSCRIPTION_DATA)];
                case 2:
                    storedConfig = _b.sent();
                    return [4 /*yield*/, getRegistration()];
                case 3:
                    registration = _b.sent();
                    return [4 /*yield*/, registration.pushManager.getSubscription()];
                case 4:
                    currentConfig = _b.sent();
                    currentConfigStringified = currentConfig ? JSON.stringify(currentConfig) : undefined;
                    if (!(storedConfig && storedConfig.value !== currentConfigStringified)) return [3 /*break*/, 6];
                    // If our registration has been unregistered and re-registered we now have different
                    // push keys. If that's the case we want to delete all existing subscription data
                    // because it isn't accurate any more.
                    console.warn("Subscription data has changed, wiping existing subscription records");
                    return [4 /*yield*/, subscriptionStore.clear()];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    if (!currentConfig) return [3 /*break*/, 7];
                    definiteConfig = currentConfig;
                    return [3 /*break*/, 9];
                case 7: return [4 /*yield*/, registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: key
                    })];
                case 8:
                    // If we haven't subscribed yet, then subscribe.
                    definiteConfig = _b.sent();
                    _b.label = 9;
                case 9: return [4 /*yield*/, configStore.put({
                        name: DatabaseKeys.SUBSCRIPTION_DATA,
                        value: JSON.stringify(definiteConfig)
                    })];
                case 10:
                    _b.sent();
                    return [2 /*return*/, definiteConfig];
            }
        });
    });
}
function getSubscriptionID() {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var sub, res, configStore;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getAndCheckSubscription()];
                case 1:
                    sub = _a.sent();
                    if (!sub) {
                        throw new Error("No subscription to check");
                    }
                    return [4 /*yield*/, pushkinRequest("/registrations", "POST", {
                            subscription: sub
                        })];
                case 2:
                    res = _a.sent();
                    return [4 /*yield*/, getDBStores()];
                case 3:
                    configStore = (_a.sent()).configStore;
                    return [4 /*yield*/, configStore.put({
                            name: DatabaseKeys.CACHED_SUBSCRIPTION_ID,
                            value: res.id
                        })];
                case 4:
                    _a.sent();
                    return [2 /*return*/, res.id];
            }
        });
    });
}
export function sendBackToMe(opts) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var subId, payload;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getSubscriptionID()];
                case 1:
                    subId = _a.sent();
                    payload = {
                        ttl: 60,
                        payload: opts.payload,
                        service_worker_url: self.location.href,
                        priority: "high"
                    };
                    return [4 /*yield*/, pushkinRequest("/registrations/" + encodeURIComponent(subId) + "?iosFromPayload=true", "POST", payload)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
export function subscribeToTopic(opts) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var confirmOpts, subId, response, subscriptionStore;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    confirmOpts = { lzCapable: true };
                    if (opts.confirmationPayload) {
                        confirmOpts.confirmation_notification = {
                            ttl: 60,
                            payload: opts.confirmationPayload,
                            service_worker_url: self.location.href,
                            priority: "high",
                            ios: opts.confirmationIOS
                        };
                    }
                    return [4 /*yield*/, getSubscriptionID()];
                case 1:
                    subId = _a.sent();
                    return [4 /*yield*/, pushkinRequest("/topics/" + opts.topic + "/subscribers/" + encodeURIComponent(subId), "POST", confirmOpts)];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, getDBStores()];
                case 3:
                    subscriptionStore = (_a.sent()).subscriptionStore;
                    return [4 /*yield*/, subscriptionStore.put({
                            topic_id: opts.topic,
                            subscribeDate: Date.now()
                        })];
                case 4:
                    _a.sent();
                    return [2 /*return*/, true];
            }
        });
    });
}
export function unsubscribeFromTopic(opts) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var subId, subscriptionStore;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getSubscriptionID()];
                case 1:
                    subId = _a.sent();
                    return [4 /*yield*/, pushkinRequest("/topics/" + opts.topic + "/subscribers/" + encodeURIComponent(subId), "DELETE", opts)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, getDBStores()];
                case 3:
                    subscriptionStore = (_a.sent()).subscriptionStore;
                    return [4 /*yield*/, subscriptionStore.del(opts.topic)];
                case 4:
                    _a.sent();
                    return [2 /*return*/, true];
            }
        });
    });
}
export function getSubscribedTopics() {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var subscriptionStore, allEntries;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // check we have a subscription and that it's still valid
                return [4 /*yield*/, getAndCheckSubscription()];
                case 1:
                    // check we have a subscription and that it's still valid
                    _a.sent();
                    return [4 /*yield*/, getDBStores()];
                case 2:
                    subscriptionStore = (_a.sent()).subscriptionStore;
                    return [4 /*yield*/, subscriptionStore.all()];
                case 3:
                    allEntries = _a.sent();
                    return [2 /*return*/, allEntries.map(function (o) { return o.topic_id; })];
            }
        });
    });
}
//# sourceMappingURL=index.js.map