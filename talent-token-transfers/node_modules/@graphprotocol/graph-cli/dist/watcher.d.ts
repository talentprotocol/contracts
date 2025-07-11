export default class Watcher {
    private onReady;
    private onTrigger;
    private onCollectFiles;
    private onError;
    private watcher;
    constructor(options: {
        onReady: () => void;
        onTrigger: (arg: any) => void;
        onCollectFiles: () => Promise<string[]>;
        onError: (error: Error) => void;
    });
    watch(): Promise<void>;
    close(): void;
}
