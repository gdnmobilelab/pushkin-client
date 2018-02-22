export interface Config {
    key?: string;
    host?: string;
}
export declare function setConfig(cfg: Config): void;
export declare function sendBackToMe(opts: any): Promise<void>;
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
export declare function subscribeToTopic(opts: SubscribeOptions): Promise<boolean>;
export interface UnsubscribeOptions {
    topic: string;
}
export declare function unsubscribeFromTopic(opts: UnsubscribeOptions): Promise<boolean>;
export declare function getSubscribedTopics(): Promise<string[]>;
