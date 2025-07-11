import { type CHash, type Hex, type PrivKey } from '../utils.ts';
import { type AffinePoint, type BasicCurve, type Group, type GroupConstructor } from './curve.ts';
import { type IField, type NLength } from './modular.ts';
export type { AffinePoint };
export type HmacFnSync = (key: Uint8Array, ...messages: Uint8Array[]) => Uint8Array;
/**
 * When Weierstrass curve has `a=0`, it becomes Koblitz curve.
 * Koblitz curves allow using **efficiently-computable GLV endomorphism ψ**.
 * Endomorphism uses 2x less RAM, speeds up precomputation by 2x and ECDH / key recovery by 20%.
 * For precomputed wNAF it trades off 1/2 init time & 1/3 ram for 20% perf hit.
 *
 * Endomorphism consists of beta, lambda and splitScalar:
 *
 * 1. GLV endomorphism ψ transforms a point: `P = (x, y) ↦ ψ(P) = (β·x mod p, y)`
 * 2. GLV scalar decomposition transforms a scalar: `k ≡ k₁ + k₂·λ (mod n)`
 * 3. Then these are combined: `k·P = k₁·P + k₂·ψ(P)`
 * 4. Two 128-bit point-by-scalar multiplications + one point addition is faster than
 *    one 256-bit multiplication.
 *
 * where
 * * beta: β ∈ Fₚ with β³ = 1, β ≠ 1
 * * lambda: λ ∈ Fₙ with λ³ = 1, λ ≠ 1
 * * splitScalar decomposes k ↦ k₁, k₂, by using reduced basis vectors.
 *   Gauss lattice reduction calculates them from initial basis vectors `(n, 0), (-λ, 0)`
 *
 * Check out `test/misc/endomorphism.js` and
 * [gist](https://gist.github.com/paulmillr/eb670806793e84df628a7c434a873066).
 */
export type EndomorphismOpts = {
    beta: bigint;
    splitScalar: (k: bigint) => {
        k1neg: boolean;
        k1: bigint;
        k2neg: boolean;
        k2: bigint;
    };
};
export type BasicWCurve<T> = BasicCurve<T> & {
    a: T;
    b: T;
    allowedPrivateKeyLengths?: readonly number[];
    wrapPrivateKey?: boolean;
    endo?: EndomorphismOpts;
    isTorsionFree?: (c: ProjConstructor<T>, point: ProjPointType<T>) => boolean;
    clearCofactor?: (c: ProjConstructor<T>, point: ProjPointType<T>) => ProjPointType<T>;
};
export type Entropy = Hex | boolean;
export type SignOpts = {
    lowS?: boolean;
    extraEntropy?: Entropy;
    prehash?: boolean;
};
export type VerOpts = {
    lowS?: boolean;
    prehash?: boolean;
    format?: 'compact' | 'der' | 'js' | undefined;
};
/** Instance methods for 3D XYZ points. */
export interface ProjPointType<T> extends Group<ProjPointType<T>> {
    /** projective x coordinate. Note: different from .x */
    readonly px: T;
    /** projective y coordinate. Note: different from .y */
    readonly py: T;
    /** projective z coordinate */
    readonly pz: T;
    /** affine x coordinate */
    get x(): T;
    /** affine y coordinate */
    get y(): T;
    assertValidity(): void;
    clearCofactor(): ProjPointType<T>;
    is0(): boolean;
    isTorsionFree(): boolean;
    multiplyUnsafe(scalar: bigint): ProjPointType<T>;
    /**
     * Massively speeds up `p.multiply(n)` by using wnaf precompute tables (caching).
     * Table generation takes 30MB of ram and 10ms on high-end CPU, but may take
     * much longer on slow devices.
     * Actual generation will happen on first call of `.multiply()`.
     * By default, BASE point is precomputed.
     * @param windowSize - table window size
     * @param isLazy - (default true) allows to defer generation
     */
    precompute(windowSize?: number, isLazy?: boolean): ProjPointType<T>;
    /** Converts 3D XYZ projective point to 2D xy affine coordinates */
    toAffine(invertedZ?: T): AffinePoint<T>;
    /** Encodes point using IEEE P1363 (DER) encoding. First byte is 2/3/4. Default = isCompressed. */
    toBytes(isCompressed?: boolean): Uint8Array;
    toHex(isCompressed?: boolean): string;
    /** @deprecated use `toBytes` */
    toRawBytes(isCompressed?: boolean): Uint8Array;
    /** @deprecated use `multiplyUnsafe` */
    multiplyAndAddUnsafe(Q: ProjPointType<T>, a: bigint, b: bigint): ProjPointType<T> | undefined;
    /** @deprecated use `p.y % 2n === 0n` */
    hasEvenY(): boolean;
    /** @deprecated use `p.precompute(windowSize)` */
    _setWindowSize(windowSize: number): void;
}
/** Static methods for 3D XYZ points. */
export interface ProjConstructor<T> extends GroupConstructor<ProjPointType<T>> {
    Fp: IField<T>;
    Fn: IField<bigint>;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    new (x: T, y: T, z: T): ProjPointType<T>;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    fromAffine(p: AffinePoint<T>): ProjPointType<T>;
    fromBytes(encodedPoint: Uint8Array): ProjPointType<T>;
    fromHex(hex: Hex): ProjPointType<T>;
    fromPrivateKey(privateKey: PrivKey): ProjPointType<T>;
    normalizeZ(points: ProjPointType<T>[]): ProjPointType<T>[];
    msm(points: ProjPointType<T>[], scalars: bigint[]): ProjPointType<T>;
}
export type CurvePointsType<T> = BasicWCurve<T> & {
    fromBytes?: (bytes: Uint8Array) => AffinePoint<T>;
    toBytes?: (c: ProjConstructor<T>, point: ProjPointType<T>, isCompressed: boolean) => Uint8Array;
};
export type CurvePointsTypeWithLength<T> = Readonly<CurvePointsType<T> & Partial<NLength>>;
export type CurvePointsRes<T> = {
    /** @deprecated import individual CURVE params */
    CURVE: CurvePointsType<T>;
    Point: ProjConstructor<T>;
    /** @deprecated use `Point` */
    ProjectivePoint: ProjConstructor<T>;
    /** @deprecated */
    normPrivateKeyToScalar: (key: PrivKey) => bigint;
    /** @deprecated */
    weierstrassEquation: (x: T) => T;
    /** @deprecated use `Point.Fn.isValidNot0(num)` */
    isWithinCurveOrder: (num: bigint) => boolean;
};
/**
 * Weierstrass curve options.
 *
 * * p: prime characteristic (order) of finite field, in which arithmetics is done
 * * n: order of prime subgroup a.k.a total amount of valid curve points
 * * h: cofactor, usually 1. h*n is group order; n is subgroup order
 * * a: formula param, must be in field of p
 * * b: formula param, must be in field of p
 * * Gx: x coordinate of generator point a.k.a. base point
 * * Gy: y coordinate of generator point
 */
export type WeierstrassOpts<T> = Readonly<{
    p: bigint;
    n: bigint;
    h: bigint;
    a: T;
    b: T;
    Gx: T;
    Gy: T;
}>;
export type WeierstrassExtraOpts<T> = Partial<{
    Fp: IField<T>;
    Fn: IField<bigint>;
    allowedPrivateKeyLengths: readonly number[];
    allowInfinityPoint: boolean;
    endo: EndomorphismOpts;
    wrapPrivateKey: boolean;
    isTorsionFree: (c: ProjConstructor<T>, point: ProjPointType<T>) => boolean;
    clearCofactor: (c: ProjConstructor<T>, point: ProjPointType<T>) => ProjPointType<T>;
    fromBytes: (bytes: Uint8Array) => AffinePoint<T>;
    toBytes: (c: ProjConstructor<T>, point: ProjPointType<T>, isCompressed: boolean) => Uint8Array;
}>;
/**
 * Options for ECDSA signatures over a Weierstrass curve.
 */
export type ECDSAOpts = {
    hash: CHash;
    hmac?: HmacFnSync;
    randomBytes?: (bytesLength?: number) => Uint8Array;
    lowS?: boolean;
    bits2int?: (bytes: Uint8Array) => bigint;
    bits2int_modN?: (bytes: Uint8Array) => bigint;
};
/** ECDSA is only supported for prime fields, not Fp2 (extension fields). */
export interface ECDSA {
    getPublicKey: (privateKey: PrivKey, isCompressed?: boolean) => Uint8Array;
    getSharedSecret: (privateA: PrivKey, publicB: Hex, isCompressed?: boolean) => Uint8Array;
    sign: (msgHash: Hex, privKey: PrivKey, opts?: SignOpts) => RecoveredSignatureType;
    verify: (signature: Hex | SignatureLike, msgHash: Hex, publicKey: Hex, opts?: VerOpts) => boolean;
    Point: ProjConstructor<bigint>;
    Signature: SignatureConstructor;
    utils: {
        isValidPrivateKey(privateKey: PrivKey): boolean;
        randomPrivateKey: () => Uint8Array;
        normPrivateKeyToScalar: (key: PrivKey) => bigint;
        /** @deprecated */
        precompute: (windowSize?: number, point?: ProjPointType<bigint>) => ProjPointType<bigint>;
    };
}
export declare class DERErr extends Error {
    constructor(m?: string);
}
export type IDER = {
    Err: typeof DERErr;
    _tlv: {
        encode: (tag: number, data: string) => string;
        decode(tag: number, data: Uint8Array): {
            v: Uint8Array;
            l: Uint8Array;
        };
    };
    _int: {
        encode(num: bigint): string;
        decode(data: Uint8Array): bigint;
    };
    toSig(hex: string | Uint8Array): {
        r: bigint;
        s: bigint;
    };
    hexFromSig(sig: {
        r: bigint;
        s: bigint;
    }): string;
};
/**
 * ASN.1 DER encoding utilities. ASN is very complex & fragile. Format:
 *
 *     [0x30 (SEQUENCE), bytelength, 0x02 (INTEGER), intLength, R, 0x02 (INTEGER), intLength, S]
 *
 * Docs: https://letsencrypt.org/docs/a-warm-welcome-to-asn1-and-der/, https://luca.ntop.org/Teaching/Appunti/asn1.html
 */
export declare const DER: IDER;
export declare function _legacyHelperEquat<T>(Fp: IField<T>, a: T, b: T): (x: T) => T;
export declare function _legacyHelperNormPriv(Fn: IField<bigint>, allowedPrivateKeyLengths?: readonly number[], wrapPrivateKey?: boolean): (key: PrivKey) => bigint;
export declare function weierstrassN<T>(CURVE: WeierstrassOpts<T>, curveOpts?: WeierstrassExtraOpts<T>): ProjConstructor<T>;
/** @deprecated use `weierstrassN` */
export declare function weierstrassPoints<T>(c: CurvePointsTypeWithLength<T>): CurvePointsRes<T>;
export interface SignatureType {
    readonly r: bigint;
    readonly s: bigint;
    readonly recovery?: number;
    assertValidity(): void;
    addRecoveryBit(recovery: number): RecoveredSignatureType;
    hasHighS(): boolean;
    normalizeS(): SignatureType;
    recoverPublicKey(msgHash: Hex): ProjPointType<bigint>;
    toCompactRawBytes(): Uint8Array;
    toCompactHex(): string;
    toDERRawBytes(): Uint8Array;
    toDERHex(): string;
}
export type RecoveredSignatureType = SignatureType & {
    readonly recovery: number;
};
export type SignatureConstructor = {
    new (r: bigint, s: bigint, recovery?: number): SignatureType;
    fromCompact(hex: Hex): SignatureType;
    fromDER(hex: Hex): SignatureType;
};
export type SignatureLike = {
    r: bigint;
    s: bigint;
};
export type PubKey = Hex | ProjPointType<bigint>;
export type CurveType = BasicWCurve<bigint> & {
    hash: CHash;
    hmac?: HmacFnSync;
    randomBytes?: (bytesLength?: number) => Uint8Array;
    lowS?: boolean;
    bits2int?: (bytes: Uint8Array) => bigint;
    bits2int_modN?: (bytes: Uint8Array) => bigint;
};
export type CurveFn = {
    CURVE: CurvePointsType<bigint>;
    getPublicKey: (privateKey: PrivKey, isCompressed?: boolean) => Uint8Array;
    getSharedSecret: (privateA: PrivKey, publicB: Hex, isCompressed?: boolean) => Uint8Array;
    sign: (msgHash: Hex, privKey: PrivKey, opts?: SignOpts) => RecoveredSignatureType;
    verify: (signature: Hex | SignatureLike, msgHash: Hex, publicKey: Hex, opts?: VerOpts) => boolean;
    Point: ProjConstructor<bigint>;
    /** @deprecated use `Point` */
    ProjectivePoint: ProjConstructor<bigint>;
    Signature: SignatureConstructor;
    utils: {
        normPrivateKeyToScalar: (key: PrivKey) => bigint;
        isValidPrivateKey(privateKey: PrivKey): boolean;
        randomPrivateKey: () => Uint8Array;
        precompute: (windowSize?: number, point?: ProjPointType<bigint>) => ProjPointType<bigint>;
    };
};
export declare function ecdsa(Point: ProjConstructor<bigint>, ecdsaOpts: ECDSAOpts, curveOpts?: WeierstrassExtraOpts<bigint>): ECDSA;
export type WsPointComposed<T> = {
    CURVE: WeierstrassOpts<T>;
    curveOpts: WeierstrassExtraOpts<T>;
};
export type WsComposed = {
    CURVE: WeierstrassOpts<bigint>;
    curveOpts: WeierstrassExtraOpts<bigint>;
    ecdsaOpts: ECDSAOpts;
};
export declare function weierstrass(c: CurveType): CurveFn;
/**
 * Implementation of the Shallue and van de Woestijne method for any weierstrass curve.
 * TODO: check if there is a way to merge this with uvRatio in Edwards; move to modular.
 * b = True and y = sqrt(u / v) if (u / v) is square in F, and
 * b = False and y = sqrt(Z * (u / v)) otherwise.
 * @param Fp
 * @param Z
 * @returns
 */
export declare function SWUFpSqrtRatio<T>(Fp: IField<T>, Z: T): (u: T, v: T) => {
    isValid: boolean;
    value: T;
};
/**
 * Simplified Shallue-van de Woestijne-Ulas Method
 * https://www.rfc-editor.org/rfc/rfc9380#section-6.6.2
 */
export declare function mapToCurveSimpleSWU<T>(Fp: IField<T>, opts: {
    A: T;
    B: T;
    Z: T;
}): (u: T) => {
    x: T;
    y: T;
};
//# sourceMappingURL=weierstrass.d.ts.map