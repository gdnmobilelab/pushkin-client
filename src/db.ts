import * as treo from "treo";
import * as treoPromise from "treo-promise";
import { getRegistrationPrefix } from "./registration";
console.log("t", treo, treoPromise);
export declare interface Store {
  get<T>(name: string): Promise<T>;
  clear(): Promise<void>;
  put<T>(value: T): Promise<void>;
  del(key: string): Promise<void>;
  all<T>(): Promise<T[]>;
}

export declare interface Database {
  store(name: "subscriptions" | "config"): Promise<Store>;
}

const schema = treo
  .schema()
  .version(1)
  .addStore("subscriptions", { key: "topic_id" })
  .version(2)
  .addStore("config", { key: "name" });

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  let prefix = await getRegistrationPrefix();
  db = treo("pushkin-client_" + prefix, schema).use(treoPromise()) as Database;
  return db;
}
