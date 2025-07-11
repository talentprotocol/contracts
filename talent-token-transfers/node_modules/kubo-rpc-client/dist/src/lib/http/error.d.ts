export declare class TimeoutError extends Error {
    constructor(message?: string);
}
export declare class AbortError extends Error {
    constructor(message?: string);
}
export declare class HTTPError extends Error {
    response: Response;
    constructor(response: Response);
}
//# sourceMappingURL=error.d.ts.map