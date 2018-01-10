import db from "./db";
import { key } from "./firebase_key";

class ServiceWorkerContext {
  registration: any;
}

declare var self: ServiceWorkerContext;

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

// need to sort that out
declare var Promise: any;

function getAndCheckSubscription() {

  return Promise.all([
    configStore.get<ConfigStoreEntry>("subscription-data"),
    self.registration.pushManager.getSubscription()
  ])
    .then(([storedConfig, currentConfig]) => {

      let currentConfigStringified = currentConfig ? JSON.stringify(currentConfig) : undefined;

      if (!storedConfig || storedConfig.value === currentConfigStringified) {
        return currentConfig
      }

      // If the config is different from the one we have stored then all of our
      // subscription data will now be incorrect. So we need to clear it.

      console.warn("Subscription data has changed, wiping existing subscription records");

      return subscriptionStore.clear()
        .then(() => {
          return currentConfig;
        })
    })
    .then((currentConfig) => {

      if (currentConfig) {
        return currentConfig;
      }

      return self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key
      });
    })
    .then((definiteConfig) => {
      return configStore
        .put<ConfigStoreEntry>({
          name: "subscription-data",
          value: JSON.stringify(definiteConfig)
        })
        .then(() => {
          return definiteConfig
        })
    })

}

function getSubscriptionID() {
  return getAndCheckSubscription().then(sub => {
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
}

export function sendBackToMe(opts) {
  return getSubscriptionID().then(subId => {
    let payload = {
      ttl: 60,
      payload: opts.payload,
      service_worker_url: (self as any).location.href,
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
  lzCapable?: boolean;
}

export interface iOSFallbackNotification {
  title: string;
  body: string;
  attachments?: string[];
  actions?: string[];
  collapse_id?: string;
  silent?: boolean;
  renotify?: boolean;
}

export interface SubscribeOptions {
  topic: string;
  confirmationPayload?: any;
  confirmationIOS?: iOSFallbackNotification;
}

export function subscribeToTopic(opts: SubscribeOptions) {
  let confirmOpts: ConfirmOptions = { lzCapable: true };

  if (opts.confirmationPayload) {
    confirmOpts.confirmation_notification = {
      ttl: 60,
      payload: opts.confirmationPayload,
      service_worker_url: (self as any).location.href,
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

export interface UnsubscribeOptions {
  topic: string;
}


export function unsubscribeFromTopic(opts: UnsubscribeOptions) {
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

export function getSubscribedTopics() {
  return getAndCheckSubscription() // doing this for the check, not the get
    .then(() => {
      return subscriptionStore.all<SubscriptionStoreEntry>()
    })
    .then(objs => {
      return objs.map(o => o.topic_id);
    });
}
