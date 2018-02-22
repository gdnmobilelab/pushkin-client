import { getDatabase } from "./db";
import { key } from "./firebase_key";
import { getRegistration } from "./registration";

export interface Config {
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

export function setConfig(cfg: Config) {
  config.key = cfg.key;
  config.host = cfg.host;
}

async function pushkinRequest(endpoint: string, method = "GET", body: any = null) {
  if (!config.key || !config.host) {
    throw new Error("Must set config variables");
  }

  let headers = new Headers();
  headers.set("Authorization", config.key);
  headers.set("Content-Type", "application/json");

  let response = await fetch(config.host + endpoint, {
    method: method,
    mode: "cors",
    headers: headers,
    body: body ? JSON.stringify(body) : null
  });

  if (!response.status || response.status < 200 || response.status > 299) {
    let text = await response.text();
    throw new Error(text);
  }

  let json = await response.json();

  if (json.errorMessage) {
    throw new Error(json.errorMessage);
  }

  return json;
}

enum DatabaseKeys {
  SUBSCRIPTION_DATA = "subscription_data",
  CACHED_SUBSCRIPTION_ID = "cached_subscription_id"
}

declare interface NameValuePair {
  name: string;
  value: string;
}

declare interface SavedSubscription {
  topic_id: string;
  subscribeDate: number;
}

async function getDBStores() {
  let db = await getDatabase();

  return {
    configStore: await db.store("config"),
    subscriptionStore: await db.store("subscriptions")
  };
}

async function getAndCheckSubscription() {
  let { configStore, subscriptionStore } = await getDBStores();

  let storedConfig = await configStore.get<NameValuePair>(DatabaseKeys.SUBSCRIPTION_DATA);
  let registration = await getRegistration();

  let currentConfig: PushSubscription | undefined = await registration.pushManager.getSubscription();

  // We stringify for a very simple comparison, rather than deep inspecting an object
  let currentConfigStringified = currentConfig ? JSON.stringify(currentConfig) : undefined;

  if (storedConfig && storedConfig.value !== currentConfigStringified) {
    // If our registration has been unregistered and re-registered we now have different
    // push keys. If that's the case we want to delete all existing subscription data
    // because it isn't accurate any more.

    console.warn("Subscription data has changed, wiping existing subscription records");

    await subscriptionStore.clear();
  }
  console.log("cleared, if applicable");
  let definiteConfig: PushSubscription;

  if (currentConfig) {
    console.log("have a config!");
    definiteConfig = currentConfig;
  } else {
    console.log("dont have a config, so will get", registration);
    // If we haven't subscribed yet, then subscribe.

    definiteConfig = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key
    });
    console.log("got?");
  }
  console.log("putting");
  await configStore.put({
    name: DatabaseKeys.SUBSCRIPTION_DATA,
    value: JSON.stringify(definiteConfig)
  });
  console.log("returning");
  return definiteConfig;
}

async function getSubscriptionID() {
  let sub = await getAndCheckSubscription();

  if (!sub) {
    throw new Error("No subscription to check");
  }

  let res = await pushkinRequest("/registrations", "POST", {
    subscription: sub
  });

  let { configStore } = await getDBStores();

  await configStore.put({
    name: DatabaseKeys.CACHED_SUBSCRIPTION_ID,
    value: res.id
  });

  return res.id;
}

export async function sendBackToMe(opts: any) {
  let subId = await getSubscriptionID();

  let payload = {
    ttl: 60,
    payload: opts.payload,
    service_worker_url: self.location.href,
    priority: "high"
  };

  await pushkinRequest(`/registrations/${encodeURIComponent(subId)}?iosFromPayload=true`, "POST", payload);
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

export async function subscribeToTopic(opts: SubscribeOptions) {
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

  let subId = await getSubscriptionID();

  let response = await pushkinRequest(
    `/topics/${opts.topic}/subscribers/${encodeURIComponent(subId)}`,
    "POST",
    confirmOpts
  );

  let { subscriptionStore } = await getDBStores();

  await subscriptionStore.put<SavedSubscription>({
    topic_id: opts.topic,
    subscribeDate: Date.now()
  });

  return true;
}

export interface UnsubscribeOptions {
  topic: string;
}

export async function unsubscribeFromTopic(opts: UnsubscribeOptions) {
  let subId = await getSubscriptionID();

  await pushkinRequest(`/topics/${opts.topic}/subscribers/${encodeURIComponent(subId)}`, "DELETE", opts);

  let { subscriptionStore } = await getDBStores();

  await subscriptionStore.del(opts.topic);

  return true;
}

export async function getSubscribedTopics() {
  // check we have a subscription and that it's still valid
  await getAndCheckSubscription();

  let { subscriptionStore } = await getDBStores();

  let allEntries = await subscriptionStore.all<SavedSubscription>();

  return allEntries.map(o => o.topic_id);
}
