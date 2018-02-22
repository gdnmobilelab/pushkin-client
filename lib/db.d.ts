export interface Store {
    get<T>(name: string): Promise<T>;
    clear(): Promise<void>;
    put<T>(value: T): Promise<void>;
    del(key: string): Promise<void>;
    all<T>(): Promise<T[]>;
}
export interface Database {
    store(name: "subscriptions" | "config"): Promise<Store>;
}
export declare function getDatabase(): Promise<Database>;
