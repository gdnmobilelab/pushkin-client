import db from "./db";
import { key } from "./firebase_key";
var ServiceWorkerContext = /** @class */ (function () {
    function ServiceWorkerContext() {
    }
    return ServiceWorkerContext;
}());
var subscriptionStore = db.store("subscriptions");
var configStore = db.store("config");
var config = {};
export function setConfig(_a) {
    var key = _a.key, host = _a.host;
    config.key = key;
    config.host = host;
}
function pushkinRequest(endpoint, method, body) {
    if (method === void 0) { method = "GET"; }
    if (body === void 0) { body = null; }
    if (!config.key || !config.host) {
        throw new Error("Must set config variables");
    }
    var headers = new Headers();
    headers.set("Authorization", config.key);
    headers.set("Content-Type", "application/json");
    return fetch(config.host + endpoint, {
        method: method,
        mode: "cors",
        headers: headers,
        body: body ? JSON.stringify(body) : null
    }).then(function (response) {
        if (!response.status || response.status < 200 || response.status > 299) {
            return response.text().then(function (text) {
                throw new Error(text);
            });
        }
        return response.json().then(function (json) {
            if (json.errorMessage) {
                throw new Error(json.errorMessage);
            }
            return json;
        });
    });
}
function getAndCheckSubscription() {
    return Promise.all([
        configStore.get("subscription-data"),
        self.registration.pushManager.getSubscription()
    ])
        .then(function (_a) {
        var storedConfig = _a[0], currentConfig = _a[1];
        var currentConfigStringified = currentConfig
            ? JSON.stringify(currentConfig)
            : undefined;
        if (!storedConfig || storedConfig.value === currentConfigStringified) {
            return currentConfig;
        }
        // If the config is different from the one we have stored then all of our
        // subscription data will now be incorrect. So we need to clear it.
        console.warn("Subscription data has changed, wiping existing subscription records");
        return subscriptionStore.clear().then(function () {
            return currentConfig;
        });
    })
        .then(function (currentConfig) {
        if (currentConfig) {
            return currentConfig;
        }
        return self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key
        });
    })
        .then(function (definiteConfig) {
        return configStore
            .put({
            name: "subscription-data",
            value: JSON.stringify(definiteConfig)
        })
            .then(function () {
            return definiteConfig;
        });
    });
}
function getSubscriptionID() {
    return getAndCheckSubscription().then(function (sub) {
        if (!sub) {
            throw new Error("No subscription to check");
        }
        return pushkinRequest("/registrations", "POST", {
            subscription: sub
        }).then(function (res) {
            return configStore
                .put({ name: "cached-subscription-id", value: res.id })
                .then(function () {
                return res.id;
            });
        });
    });
}
export function sendBackToMe(opts) {
    return getSubscriptionID().then(function (subId) {
        var payload = {
            ttl: 60,
            payload: opts.payload,
            service_worker_url: self.location.href,
            priority: "high"
        };
        return pushkinRequest("/registrations/" + subId + "?iosFromPayload=true", "POST", payload);
    });
}
export function subscribeToTopic(opts) {
    var confirmOpts = { lzCapable: true };
    if (opts.confirmationPayload) {
        confirmOpts.confirmation_notification = {
            ttl: 60,
            payload: opts.confirmationPayload,
            service_worker_url: self.location.href,
            priority: "high",
            ios: opts.confirmationIOS
        };
    }
    return getSubscriptionID().then(function (subId) {
        return pushkinRequest("/topics/" + opts.topic + "/subscribers/" + encodeURIComponent(subId), "POST", confirmOpts).then(function (response) {
            return subscriptionStore
                .put({
                topic_id: opts.topic,
                subscribeDate: Date.now()
            })
                .then(function () {
                return response;
            });
        });
    });
}
export function unsubscribeFromTopic(opts) {
    return getSubscriptionID()
        .then(function (subId) {
        return pushkinRequest("/topics/" + opts.topic + "/subscribers/" + encodeURIComponent(subId), "DELETE", opts);
    })
        .then(function () {
        return subscriptionStore.del(opts.topic);
    });
}
export function getSubscribedTopics() {
    return getAndCheckSubscription() // doing this for the check, not the get
        .then(function () {
        return subscriptionStore.all();
    })
        .then(function (objs) {
        return objs.map(function (o) { return o.topic_id; });
    });
}
//# sourceMappingURL=index.js.map