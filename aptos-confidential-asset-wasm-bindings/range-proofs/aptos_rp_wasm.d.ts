/* tslint:disable */
/* eslint-disable */
export function range_proof(v: bigint, r: Uint8Array, val_base: Uint8Array, rand_base: Uint8Array, num_bits: number): RangeProof;
export function batch_range_proof(v: BigUint64Array, rs: Uint8Array[], val_base: Uint8Array, rand_base: Uint8Array, num_bits: number): BatchRangeProof;
export function batch_verify_proof(proof: Uint8Array, comm: Uint8Array[], val_base: Uint8Array, rand_base: Uint8Array, num_bits: number): boolean;
export function verify_proof(proof: Uint8Array, comm: Uint8Array, val_base: Uint8Array, rand_base: Uint8Array, num_bits: number): boolean;
export class BatchRangeProof {
  private constructor();
  free(): void;
  proof(): Uint8Array;
  comms(): Uint8Array[];
}
export class RangeProof {
  private constructor();
  free(): void;
  proof(): Uint8Array;
  comm(): Uint8Array;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_rangeproof_free: (a: number, b: number) => void;
  readonly rangeproof_proof: (a: number) => [number, number];
  readonly rangeproof_comm: (a: number) => [number, number];
  readonly range_proof: (a: bigint, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number];
  readonly __wbg_batchrangeproof_free: (a: number, b: number) => void;
  readonly batchrangeproof_proof: (a: number) => [number, number];
  readonly batchrangeproof_comms: (a: number) => [number, number];
  readonly batch_range_proof: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number, number];
  readonly batch_verify_proof: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number, number];
  readonly verify_proof: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number, number];
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __externref_drop_slice: (a: number, b: number) => void;
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
