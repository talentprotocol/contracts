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
export declare class InvalidMtimeError extends Error {
    constructor(message?: string);
}
//# sourceMappingURL=errors.d.ts.map