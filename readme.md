# pushkin-client

A client JS library for use with [pushkin-firebase](https://github.com/gdnmobilelab/pushkin-firebase).

## Use

Install the library using NPM:

    npm install https://github.com/gdnmobilelab/pushkin-client

Before calling any operations in your code, you need to set the configuration options:

    import { setConfig } from "pushkin-client";

    setConfig({
        host: "http://localhost:3000",
        key: "USER_KEY"
    })

Then you can run subscribe, unsubscribe and list operations:

    import {subscribeToTopic, unsubscribeFromTopic} from "pushkin-client";

    await subscribeToTopic({topic: "test-topic"});
    await getSubscribedTopics(); // == ["test-topic"]
    await unsubscribeFromTopic({topic: "test-topic"});

## Major issues

Right now this library does not support multiple service worker registrations per domain.

## Future development

There is an extensive rewrite in the "refactor" branch that uses
async/await internally, as well as allowing use outside of a service worker and multiple registrations. More to come.
