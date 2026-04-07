/* tslint:disable */
/* eslint-disable */

/**
 * Result of a batch range proof generation
 */
export class BatchRangeProof {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Returns the serialized commitments (each 32 bytes)
     */
    comms(): Uint8Array[];
    /**
     * Returns the serialized proof bytes
     */
    proof(): Uint8Array;
}

/**
 * Discrete log solver supporting 16-bit and 32-bit secrets.
 */
export class DiscreteLogSolver {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Returns the algorithm name.
     */
    algorithm(): string;
    /**
     * Returns the supported bit sizes as an array [16, 32].
     */
    max_num_bits(): Uint8Array;
    /**
     * Creates a new solver with precomputed tables.
     */
    constructor();
    /**
     * Solves the discrete log problem.
     *
     * Given a compressed Ristretto point y = g^x (32 bytes), finds x.
     *
     * # Arguments
     * * `y` - The compressed Ristretto point (32 bytes)
     * * `max_num_bits` - Maximum bits of the secret: 16 or 32
     *
     * # Returns
     * The discrete log x, or an error if not found or invalid input.
     */
    solve(y: Uint8Array, max_num_bits: number): bigint;
}

/**
 * Generate a batch range proof for multiple values.
 *
 * # Arguments
 * * `v` - The secret values to prove are in range [0, 2^num_bits)
 * * `rs` - The blinding factors (each 32-byte scalar)
 * * `val_base` - Value base point for Pedersen commitment (32-byte compressed point)
 * * `rand_base` - Randomness base point for Pedersen commitment (32-byte compressed point)
 * * `num_bits` - Bit length for range proof (8, 16, 32, or 64)
 */
export function batch_range_proof(v: BigUint64Array, rs: Uint8Array[], val_base: Uint8Array, rand_base: Uint8Array, num_bits: number): BatchRangeProof;

/**
 * Verify a batch range proof.
 */
export function batch_verify_proof(proof: Uint8Array, comms: Uint8Array[], val_base: Uint8Array, rand_base: Uint8Array, num_bits: number): boolean;

/**
 * Installs a panic hook that forwards Rust panic messages to `console.error`.
 * Called automatically on WASM init. Without this, panics surface as an
 * opaque `RuntimeError: unreachable` with no message.
 */
export function init(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_discretelogsolver_free: (a: number, b: number) => void;
    readonly discretelogsolver_algorithm: (a: number) => [number, number];
    readonly discretelogsolver_max_num_bits: (a: number) => [number, number];
    readonly discretelogsolver_new: () => number;
    readonly discretelogsolver_solve: (a: number, b: number, c: number, d: number) => [bigint, number, number];
    readonly __wbg_batchrangeproof_free: (a: number, b: number) => void;
    readonly batch_range_proof: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number, number];
    readonly batch_verify_proof: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number, number];
    readonly batchrangeproof_comms: (a: number) => [number, number];
    readonly batchrangeproof_proof: (a: number) => [number, number];
    readonly init: () => void;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
