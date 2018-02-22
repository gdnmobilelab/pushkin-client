import * as pushkin from "../src";
import { PushManagerStub } from "./push-manager-stub";

async function unregister() {
  console.log("clear");
  let registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    await registration.unregister();
  }
}

describe("Pushkin", () => {
  before(async function() {
    await unregister();
    await navigator.serviceWorker.register("/dummy-worker.js");
    pushkin.setConfig({
      host: "http://localhost:3000",
      key: "USER_KEY"
    });
  });

  after(async function() {
    PushManagerStub.restore();
    await unregister();
  });

  it("should subscribe to a topic", async function() {
    let reg = await navigator.serviceWorker.getRegistration();

    new PushManagerStub(reg);

    await pushkin.subscribeToTopic({
      topic: "test-topic"
    });
  });
});
