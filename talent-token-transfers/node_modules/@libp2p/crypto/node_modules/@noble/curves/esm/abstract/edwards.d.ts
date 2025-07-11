/**
 * Twisted Edwards curve. The formula is: ax² + y² = 1 + dx²y².
 * For design rationale of types / exports, see weierstrass module documentation.
 * Untwisted Edwards curves exist, but they aren't used in real-world protocols.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { type FHash, type Hex } from '../utils.ts';
import { type AffinePoint, type BasicCurve, type Group, type GroupConstructor } from './curve.ts';
import { type IField, type NLength } from './modular.ts';
export type UVRatio = (u: bigint, v: bigint) => {
    isValid: boolean;
    value: bigint;
};
/** Edwards curves must declare params a & d. */
export type CurveType = BasicCurve<bigint> & {
    a: bigint;
    d: bigint;
    hash: FHash;
    randomBytes?: (bytesLength?: number) => Uint8Array;
    adjustScalarBytes?: (bytes: Uint8Array) => Uint8Array;
    domain?: (data: Uint8Array, ctx: Uint8Array, phflag: boolean) => Uint8Array;
    uvRatio?: UVRatio;
    prehash?: FHash;
    mapToCurve?: (scalar: bigint[]) => AffinePoint<bigint>;
};
export type CurveTypeWithLength = Readonly<CurveType & Partial<NLength>>;
/** Instance of Extended Point with coordinates in X, Y, Z, T. */
export interface ExtPointType extends Group<ExtPointType> {
    readonly ex: bigint;
    readonly ey: bigint;
    readonly ez: bigint;
    readonly et: bigint;
    get x(): bigint;
    get y(): bigint;
    assertValidity(): void;
    multiply(scalar: bigint): ExtPointType;
    multiplyUnsafe(scalar: bigint): ExtPointType;
    is0(): boolean;
    isSmallOrder(): boolean;
    isTorsionFree(): boolean;
    clearCofactor(): ExtPointType;
    toAffine(iz?: bigint): AffinePoint<bigint>;
    toBytes(): Uint8Array;
    /** @deprecated use `toBytes` */
    toRawBytes(): Uint8Array;
    toHex(): string;
    precompute(windowSize?: number, isLazy?: boolean): ExtPointType;
    /** @deprecated use `p.precompute(windowSize)` */
    _setWindowSize(windowSize: number): void;
}
/** Static methods of Extended Point with coordinates in X, Y, Z, T. */
export interface ExtPointConstructor extends GroupConstructor<ExtPointType> {
    new (x: bigint, y: bigint, z: bigint, t: bigint): ExtPointType;
    Fp: IField<bigint>;
    Fn: IField<bigint>;
    fromAffine(p: AffinePoint<bigint>): ExtPointType;
    fromBytes(bytes: Uint8Array, zip215?: boolean): ExtPointType;
    fromHex(hex: Hex, zip215?: boolean): ExtPointType;
    msm(points: ExtPointType[], scalars: bigint[]): ExtPointType;
}
/**
 * Twisted Edwards curve options.
 *
 * * a: formula param
 * * d: formula param
 * * p: prime characteristic (order) of finite field, in which arithmetics is done
 * * n: order of prime subgroup a.k.a total amount of valid curve points
 * * h: cofactor. h*n is group order; n is subgroup order
 * * Gx: x coordinate of generator point a.k.a. base point
 * * Gy: y coordinate of generator point
 */
export type EdwardsOpts = Readonly<{
    a: bigint;
    d: bigint;
    p: bigint;
    n: bigint;
    h: bigint;
    Gx: bigint;
    Gy: bigint;
}>;
/**
 * Extra curve options for Twisted Edwards.
 *
 * * Fp: redefined Field over curve.p
 * * Fn: redefined Field over curve.n
 * * uvRatio: helper function for decompression, calculating √(u/v)
 */
export type EdwardsExtraOpts = Partial<{
    Fp: IField<bigint>;
    Fn: IField<bigint>;
    uvRatio: (u: bigint, v: bigint) => {
        isValid: boolean;
        value: bigint;
    };
}>;
/**
 * EdDSA (Edwards Digital Signature algorithm) options.
 *
 * * hash: hash function used to hash private keys and messages
 * * adjustScalarBytes: clears bits to get valid field element
 * * domain: Used for hashing
 * * mapToCurve: for hash-to-curve standard
 * * prehash: RFC 8032 pre-hashing of messages to sign() / verify()
 * * randomBytes: function generating random bytes, used for randomPrivateKey
 */
export type EdDSAOpts = {
    hash: FHash;
    adjustScalarBytes?: (bytes: Uint8Array) => Uint8Array;
    domain?: (data: Uint8Array, ctx: Uint8Array, phflag: boolean) => Uint8Array;
    mapToCurve?: (scalar: bigint[]) => AffinePoint<bigint>;
    prehash?: FHash;
    randomBytes?: (bytesLength?: number) => Uint8Array;
};
/**
 * EdDSA (Edwards Digital Signature algorithm) interface.
 *
 * Allows to create and verify signatures, create public and private keys.
 */
export interface EdDSA {
    getPublicKey: (privateKey: Hex) => Uint8Array;
    sign: (message: Hex, privateKey: Hex, options?: {
        context?: Hex;
    }) => Uint8Array;
    verify: (sig: Hex, message: Hex, publicKey: Hex, options?: {
        context?: Hex;
        zip215: boolean;
    }) => boolean;
    Point: ExtPointConstructor;
    utils: {
        randomPrivateKey: () => Uint8Array;
        getExtendedPublicKey: (key: Hex) => {
            head: Uint8Array;
            prefix: Uint8Array;
            scalar: bigint;
            point: ExtPointType;
            pointBytes: Uint8Array;
        };
        /** @deprecated use `point.precompute()` */
        precompute: (windowSize?: number, point?: ExtPointType) => ExtPointType;
    };
}
export type CurveFn = {
    CURVE: CurveType;
    getPublicKey: (privateKey: Hex) => Uint8Array;
    sign: (message: Hex, privateKey: Hex, options?: {
        context?: Hex;
    }) => Uint8Array;
    verify: (sig: Hex, message: Hex, publicKey: Hex, options?: {
        context?: Hex;
        zip215: boolean;
    }) => boolean;
    Point: ExtPointConstructor;
    /** @deprecated use `Point` */
    ExtendedPoint: ExtPointConstructor;
    utils: {
        randomPrivateKey: () => Uint8Array;
        getExtendedPublicKey: (key: Hex) => {
            head: Uint8Array;
            prefix: Uint8Array;
            scalar: bigint;
            point: ExtPointType;
            pointBytes: Uint8Array;
        };
        precompute: (windowSize?: number, point?: ExtPointType) => ExtPointType;
    };
};
export declare function edwards(CURVE: EdwardsOpts, curveOpts?: EdwardsExtraOpts): ExtPointConstructor;
/**
 * Initializes EdDSA signatures over given Edwards curve.
 */
export declare function eddsa(Point: ExtPointConstructor, eddsaOpts: EdDSAOpts): EdDSA;
export type EdComposed = {
    CURVE: EdwardsOpts;
    curveOpts: EdwardsExtraOpts;
    eddsaOpts: EdDSAOpts;
};
export declare function twistedEdwards(c: CurveTypeWithLength): CurveFn;
//# sourceMappingURL=edwards.d.ts.map