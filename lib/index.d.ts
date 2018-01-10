export declare function setConfig({key, host}: {
    key: any;
    host: any;
}): void;
export declare function sendBackToMe(opts: any): any;
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
export declare function subscribeToTopic(opts: SubscribeOptions): any;
export interface UnsubscribeOptions {
    topic: string;
}
export declare function unsubscribeFromTopic(opts: UnsubscribeOptions): any;
export declare function getSubscribedTopics(): any;
