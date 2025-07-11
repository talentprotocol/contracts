/**
 * Signing a message failed
 */
export declare class SigningError extends Error {
    constructor(message?: string);
}
/**
 * Verifying a message signature failed
 */
export declare class VerificationError extends Error {
    constructor(message?: string);
}
/**
 * WebCrypto was not available in the current context
 */
export declare class WebCryptoMissingError extends Error {
    constructor(message?: string);
}
//# sourceMappingURL=errors.d.ts.map