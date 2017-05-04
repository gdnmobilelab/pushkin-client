import db from './db';

let subscriptionStore = db.store("subscriptions");
let configStore = db.store("config");

let config = {};

export function setConfig({key, host}) {
    config.key = key;
    config.host = host;
}

function pushkinRequest(endpoint, method = 'GET', body = null) {
   
    if (!config.key || !config.host) {
        throw new Error("Must set config variables");
    }
    
    let headers = new Headers();
    headers.set('Authorization', config.key);
    headers.set('Content-Type', 'application/json');
    
    return fetch(config.host + endpoint, {
        method: method,
        mode: 'cors',
        headers: headers,
        body: body ? JSON.stringify(body) : null
    })
    .then((response) => {
        if (!response.status || response.status < 200 || response.status > 299) {
            return response.text()
            .then((text) => {
                throw new Error(text);
            })
        }
        return response.json()
        .then((json) => {
            if (json.errorMessage) {
                throw new Error(json.errorMessage);
            }
            return json;
        })
    })
};

function tryGetSubscriptionFromStore() {
    // first attempt is to get the one we already have - before cache to keep it fresh
    return self.registration.pushManager.getSubscription()
    .then((sub) => {
        if (sub) {
            console.log("Found live push subscription")
            // if we've got it, save it, return it
            return configStore.put({
                name: 'subscription-data',
                value: JSON.stringify(sub)
            })
            .then(() => {
                return sub;
            })
        } else {
            // now try to get our cached copy
            return configStore.get('subscription-data')
            .then((obj) => {
                if (obj) {
                    try {
                        console.log("Found cached push subscription")
                        return JSON.parse(obj.value);
                    } catch (err) {
                        console.error('could not deserialize', err);
                    }
                    // if there's no cached copy, we try to get a new subscription
                }
                console.log("No push subscription, creating one...")
                return self.registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: new Uint8Array([4, 51, 148, 247, 223, 161, 235, 177, 220, 3, 162, 94, 21, 113, 219, 72, 211, 46, 237, 237, 178, 52, 219, 183, 71, 58, 12, 143, 196, 204, 225, 111, 60, 140, 132, 223, 171, 182, 102, 62, 242, 12, 212, 139, 254, 227, 249, 118, 47, 20, 28, 99, 8, 106, 111, 45, 177, 26, 149, 176, 206, 55, 192, 156, 110])
                })
            })
        }
    })
}

function getSubscriptionID() {
    return configStore.get('cached-subscription-id')
    .then((cached) => {

        // disable for now

        // if (cached) {
        //     return cached.value;
        // }

        return tryGetSubscriptionFromStore()
        .then((sub) => {
            if (!sub) {
                throw new Error("No subscription to check")
            }
            return pushkinRequest("/registrations", "POST", {
                subscription: sub
            })
            .then((res) => {
                return configStore.put({name: 'cached-subscription-id', value: res.id})
                .then(() => {
                    return res.id;
                })
                
            })
        })
    })
    
}


export function sendBackToMe(opts) {
    return getSubscriptionID()
    .then((subId) => {
        let payload = {
            ttl: 60,
            payload: opts.payload,
            service_worker_url: self.registration.active.scriptURL,
            priority: 'high'
        }
        console.log(payload)
        return pushkinRequest(`/registrations/${subId}?iosFromPayload=true`, 'POST', payload);
    })
}

export function subscribeToTopic(opts) {  

    let confirmOpts = {};

    if (opts.confirmationPayload) {
        confirmOpts.confirmation_notification = {
            ttl: 60,
            payload: opts.confirmationPayload,
            service_worker_url: self.registration.active.scriptURL,
            priority: 'high',
            ios: opts.confirmationIOS
        }
    }

    return getSubscriptionID()
    .then((subId) => {
        return pushkinRequest(`/topics/${opts.topic}/subscribers/${encodeURIComponent(subId)}`, 'POST', confirmOpts)
        .then((response) => {
            return subscriptionStore.put({
                topic_id: opts.topic,
                subscribeDate: Date.now()
            })
            .then(() => {
                return response;
            })
        })
    })
    
}

export function unsubscribeFromTopic (opts) {
    return getSubscriptionID()
    .then((subId) => {
        return pushkinRequest(`/topics/${opts.topic}/subscribers/${encodeURIComponent(subId)}`, 'DELETE', opts)
    })
    .then(() => {
        return subscriptionStore.del(opts.topic)
    })
}

export function getSubscribedTopics(opts) {
    return subscriptionStore.all()
    .then((objs) => {
        return objs.map((o) => o.topic_id);
    })
    // return getSubscriptionID()
    // .then((subId) => {
    //     return pushkinRequest(`/registrations/${encodeURIComponent(subId)}/topics`)
    // })
}
