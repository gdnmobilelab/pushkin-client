let pushManagerStubbed = false;

const pushSubscribe = PushManager.prototype.subscribe;
const pushGetSubscription = PushManager.prototype.getSubscription;

class DummySubscription implements PushSubscription {
  endpoint: string;
  options: PushSubscriptionOptions;

  constructor(endpoint: string, options: PushSubscriptionOptions) {
    this.endpoint = endpoint;
    this.options = options;
  }

  getKey() {
    return new ArrayBuffer(0);
  }

  toJSON() {
    return {
      endpoint: this.endpoint,
      keys: {
        p256dh: "TEST_KEY_P256DH",
        auth: "TEST_AUTH_KEY"
      }
    };
  }

  unsubscribe() {
    return Promise.resolve(true);
  }
}

export class PushManagerStub {
  sub: DummySubscription | undefined;

  constructor(registration: ServiceWorkerRegistration) {
    if (pushManagerStubbed) {
      throw new Error("PushManager is already stubbed");
    }

    PushManager.prototype.getSubscription = this.getSubscription.bind(this);
    PushManager.prototype.subscribe = this.subscribe.bind(this);
    pushManagerStubbed = true;
  }

  getSubscription() {
    return Promise.resolve(this.sub);
  }

  subscribe(options: PushSubscriptionOptions) {
    this.sub = new DummySubscription(`http://www.example.org/endpoint/${Math.random()}/whatever`, options);
    return Promise.resolve(this.sub);
  }

  static restore() {
    PushManager.prototype.subscribe = pushSubscribe;
    PushManager.prototype.getSubscription = pushGetSubscription;
  }
}
