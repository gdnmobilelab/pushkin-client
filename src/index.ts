import db from "./db";
import { key } from "./firebase_key";

let subscriptionStore = db.store("subscriptions");
let configStore = db.store("config");

interface Config {
  key?: string;
  host?: string;
}

let config: Config = {};

interface ConfigStoreEntry {
  name: string;
  value: string;
}

interface SubscriptionStoreEntry {
  topic_id: string;
  subscribeDate: number;
}

export function setConfig({ key, host }) {
  config.key = key;
  config.host = host;
}

function pushkinRequest(endpoint, method = "GET", body = null): any {
  if (!config.key || !config.host) {
    throw new Error("Must set config variables");
  }

  let headers = new Headers();
  headers.set("Authorization", config.key);
  headers.set("Content-Type", "application/json");

  return fetch(config.host + endpoint, {
    method: method,
    mode: "cors",
    headers: headers,
    body: body ? JSON.stringify(body) : null
  }).then(response => {
    if (!response.status || response.status < 200 || response.status > 299) {
      return response.text().then(text => {
        throw new Error(text);
      });
    }
    return response.json().then(json => {
      if (json.errorMessage) {
        throw new Error(json.errorMessage);
      }
      return json;
    });
  });
}

function tryGetSubscriptionFromStore() {
  // first attempt is to get the one we already have - before cache to keep it fresh
  return self.registration.pushManager.getSubscription().then(sub => {
    if (sub) {
      console.log("Found live push subscription");
      // if we've got it, save it, return it
      return configStore
        .put<ConfigStoreEntry>({
          name: "subscription-data",
          value: JSON.stringify(sub)
        })
        .then(() => {
          return sub;
        });
    } else {
      // now try to get our cached copy
      return configStore.get<ConfigStoreEntry>("subscription-data").then(obj => {
        if (obj) {
          try {
            console.log("Found cached push subscription");
            return JSON.parse(obj.value);
          } catch (err) {
            console.error("could not deserialize", err);
          }
          // if there's no cached copy, we try to get a new subscription
        }
        console.log("No push subscription, creating one...");
        return self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key
        });
      });
    }
  });
}

function getSubscriptionID() {
  return configStore.get("cached-subscription-id").then(cached => {
    // disable for now

    // if (cached) {
    //     return cached.value;
    // }

    return tryGetSubscriptionFromStore().then(sub => {
      if (!sub) {
        throw new Error("No subscription to check");
      }
      return pushkinRequest("/registrations", "POST", {
        subscription: sub
      }).then(res => {
        return configStore
          .put<ConfigStoreEntry>({ name: "cached-subscription-id", value: res.id })
          .then(() => {
            return res.id;
          });
      });
    });
  });
}

export function sendBackToMe(opts) {
  return getSubscriptionID().then(subId => {
    let payload = {
      ttl: 60,
      payload: opts.payload,
      service_worker_url: self.registration.active.scriptURL,
      priority: "high"
    };
    console.log(payload);
    return pushkinRequest(
      `/registrations/${subId}?iosFromPayload=true`,
      "POST",
      payload
    );
  });
}

interface ConfirmOptions {
  confirmation_notification?: any;
}

export function subscribeToTopic(opts) {
  let confirmOpts: ConfirmOptions = {};

  if (opts.confirmationPayload) {
    confirmOpts.confirmation_notification = {
      ttl: 60,
      payload: opts.confirmationPayload,
      service_worker_url: self.registration.active.scriptURL,
      priority: "high",
      ios: opts.confirmationIOS
    };
  }

  return getSubscriptionID().then(subId => {
    return pushkinRequest(
      `/topics/${opts.topic}/subscribers/${encodeURIComponent(subId)}`,
      "POST",
      confirmOpts
    ).then(response => {
      return subscriptionStore
        .put<SubscriptionStoreEntry>({
          topic_id: opts.topic,
          subscribeDate: Date.now()
        })
        .then(() => {
          return response;
        });
    });
  });
}

export function unsubscribeFromTopic(opts) {
  return getSubscriptionID()
    .then(subId => {
      return pushkinRequest(
        `/topics/${opts.topic}/subscribers/${encodeURIComponent(subId)}`,
        "DELETE",
        opts
      );
    })
    .then(() => {
      return subscriptionStore.del(opts.topic);
    });
}

export function getSubscribedTopics(opts) {
  return subscriptionStore.all<SubscriptionStoreEntry>().then(objs => {
    return objs.map(o => o.topic_id);
  });
  // return getSubscriptionID()
  // .then((subId) => {
  //     return pushkinRequest(`/registrations/${encodeURIComponent(subId)}/topics`)
  // })
}
