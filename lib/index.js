"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var db_1 = require("./db");
var firebase_key_1 = require("./firebase_key");
var subscriptionStore = db_1.default.store("subscriptions");
var configStore = db_1.default.store("config");
var config = {};
function setConfig(_a) {
    var key = _a.key, host = _a.host;
    config.key = key;
    config.host = host;
}
exports.setConfig = setConfig;
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
function tryGetSubscriptionFromStore() {
    // first attempt is to get the one we already have - before cache to keep it fresh
    return self.registration.pushManager.getSubscription().then(function (sub) {
        if (sub) {
            console.log("Found live push subscription");
            // if we've got it, save it, return it
            return configStore
                .put({
                name: "subscription-data",
                value: JSON.stringify(sub)
            })
                .then(function () {
                return sub;
            });
        }
        else {
            // now try to get our cached copy
            return configStore.get("subscription-data").then(function (obj) {
                if (obj) {
                    try {
                        console.log("Found cached push subscription");
                        return JSON.parse(obj.value);
                    }
                    catch (err) {
                        console.error("could not deserialize", err);
                    }
                    // if there's no cached copy, we try to get a new subscription
                }
                console.log("No push subscription, creating one...");
                return self.registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: firebase_key_1.key
                });
            });
        }
    });
}
function getSubscriptionID() {
    return configStore.get("cached-subscription-id").then(function (cached) {
        // disable for now
        // if (cached) {
        //     return cached.value;
        // }
        return tryGetSubscriptionFromStore().then(function (sub) {
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
    });
}
function sendBackToMe(opts) {
    return getSubscriptionID().then(function (subId) {
        var payload = {
            ttl: 60,
            payload: opts.payload,
            service_worker_url: self.registration.active.scriptURL,
            priority: "high"
        };
        console.log(payload);
        return pushkinRequest("/registrations/" + subId + "?iosFromPayload=true", "POST", payload);
    });
}
exports.sendBackToMe = sendBackToMe;
function subscribeToTopic(opts) {
    var confirmOpts = {};
    if (opts.confirmationPayload) {
        confirmOpts.confirmation_notification = {
            ttl: 60,
            payload: opts.confirmationPayload,
            service_worker_url: self.registration.active.scriptURL,
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
exports.subscribeToTopic = subscribeToTopic;
function unsubscribeFromTopic(opts) {
    return getSubscriptionID()
        .then(function (subId) {
        return pushkinRequest("/topics/" + opts.topic + "/subscribers/" + encodeURIComponent(subId), "DELETE", opts);
    })
        .then(function () {
        return subscriptionStore.del(opts.topic);
    });
}
exports.unsubscribeFromTopic = unsubscribeFromTopic;
function getSubscribedTopics(opts) {
    return subscriptionStore.all().then(function (objs) {
        return objs.map(function (o) { return o.topic_id; });
    });
    // return getSubscriptionID()
    // .then((subId) => {
    //     return pushkinRequest(`/registrations/${encodeURIComponent(subId)}/topics`)
    // })
}
exports.getSubscribedTopics = getSubscribedTopics;
