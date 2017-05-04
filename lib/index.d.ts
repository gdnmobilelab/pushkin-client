export declare function setConfig({key, host}: {
    key: any;
    host: any;
}): void;
export declare function sendBackToMe(opts: any): Promise<any>;
export declare function subscribeToTopic(opts: any): Promise<any>;
export declare function unsubscribeFromTopic(opts: any): Promise<void>;
export declare function getSubscribedTopics(opts: any): Promise<string[]>;
