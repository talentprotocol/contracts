import type { ECDHKey } from '../interface.js';
export type Curve = 'P-256' | 'P-384' | 'P-521';
/**
 * Generates an ephemeral public key and returns a function that will compute the shared secret key.
 *
 * Focuses only on ECDH now, but can be made more general in the future.
 */
export declare function generateEphemeralKeyPair(curve: Curve): Promise<ECDHKey>;
//# sourceMappingURL=index.d.ts.map