# `@aptos-labs/confidential-asset-bindings` — API Reference

## Overview

`@aptos-labs/confidential-asset-bindings` is a cross-platform cryptographic library for working with Aptos confidential assets. It exposes two core capabilities: solving the discrete logarithm problem on the Ristretto255 curve (used to decrypt encrypted balances) and generating and verifying Bulletproof range proofs (used to prove a hidden value lies within a valid range without revealing it). The library targets Web (via WASM loaded from the unpkg CDN), Node.js (via WASM from `node_modules`, with a CDN fallback), iOS (C FFI backed by an xcframework), and Android (JNI backed by `.so` shared libraries). On React Native, all operations are delegated to a native JSI module.

---

## Import

```typescript
import {
  solveDiscreteLog,
  batchRangeProof,
  batchVerifyProof,
} from '@aptos-labs/confidential-asset-bindings';
```

All three exports are available from the single package entry point. No platform-specific imports are required; the correct implementation is resolved automatically at build time.

---

## Functions

### `solveDiscreteLog`

```typescript
function solveDiscreteLog(y: Uint8Array, maxNumBits: number): Promise<bigint>
```

Solves the discrete logarithm `n` such that `n * G === y` on the Ristretto255 curve, where `G` is the standard base point. This is used to decrypt a confidential asset balance from its encrypted form: an encrypted balance is stored on-chain as a Ristretto255 point, and `solveDiscreteLog` recovers the underlying integer.

The solver uses a baby-step giant-step (or equivalent) algorithm and searches the space `[0, 2^maxNumBits)`. Because the search is bounded, only the values 16 and 32 are supported for `maxNumBits`. Larger search spaces are not supported and will throw.

The underlying WASM module is initialized lazily on the first call and reused for all subsequent calls (singleton). On React Native, this function delegates directly to the native JSI module and does not use WASM.

#### Parameters

| Parameter | Type | Constraints | Description |
|---|---|---|---|
| `y` | `Uint8Array` | Exactly 32 bytes; must be a valid compressed Ristretto255 point | The encrypted value, encoded as a compressed Ristretto255 point representing `n * G`. |
| `maxNumBits` | `number` | Must be `16` or `32` | The bit width of the search space. The solver searches `n` in `[0, 2^maxNumBits)`. |

#### Return value

A `Promise` that resolves to a `bigint` — the value `n` such that `n * G === y`.

#### Throws

- If `y` is not exactly 32 bytes.
- If `y` does not decode to a valid Ristretto255 point.
- If `maxNumBits` is not `16` or `32`.
- If no solution exists within the search space `[0, 2^maxNumBits)`.
- In release builds, internal Rust errors are sanitized to `"confidential asset operation failed"`.

#### Example

```typescript
import { solveDiscreteLog } from '@aptos-labs/confidential-asset-bindings';

// encryptedPoint is a 32-byte compressed Ristretto255 point received from on-chain
async function decryptBalance(encryptedPoint: Uint8Array): Promise<bigint> {
  const balance = await solveDiscreteLog(encryptedPoint, 32);
  return balance;
}
```

---

### `batchRangeProof`

```typescript
function batchRangeProof(inputs: BatchRangeProofInputs): Promise<BatchRangeProofResult>
```

Generates a Bulletproof batch range proof proving that each value in `inputs.v` lies in `[0, 2^numBits)`, without revealing the values themselves. The proof is computed over the Pedersen commitment scheme using the supplied base points.

The proof is generated using bulletproofs v5.0.0 with the domain separation tag `b"AptosConfidentialAsset/BulletproofRangeProof"`. Proofs produced by this function are verifiable on-chain by aptos-core (which uses bulletproofs v4.0.0). The DST must not be changed or the on-chain verifier will reject the proof.

The maximum supported batch size is 16 values. Each input value must be a non-negative integer less than `2^64`.

#### Parameters

| Parameter | Type | Description |
|---|---|---|
| `inputs` | `BatchRangeProofInputs` | See type definition below. |

#### Return value

A `Promise` that resolves to a `BatchRangeProofResult` containing the serialized proof bytes and one Pedersen commitment per input value.

#### Throws

- If `numBits` is not in `{8, 16, 32, 64}`.
- If `rs.length !== v.length`.
- If any element of `rs` is not exactly 32 bytes.
- If any element of `v` is outside the unsigned 64-bit integer range (`v < 0` or `v >= 2^64`).
- In release builds, internal Rust errors are sanitized to `"confidential asset operation failed"`.

#### Example

```typescript
import { batchRangeProof } from '@aptos-labs/confidential-asset-bindings';

const valBase = new Uint8Array(32).fill(1);   // replace with real base point
const randBase = new Uint8Array(32).fill(2);  // replace with real base point

const r = crypto.getRandomValues(new Uint8Array(32));

const result = await batchRangeProof({
  v: [42n],
  rs: [r],
  valBase,
  randBase,
  numBits: 32,
});

console.log(result.proof);   // Uint8Array — serialized Bulletproof
console.log(result.comms);   // Uint8Array[] — one Pedersen commitment per value
```

---

### `batchVerifyProof`

```typescript
function batchVerifyProof(inputs: BatchVerifyRangeProofInputs): Promise<boolean>
```

Verifies a Bulletproof batch range proof previously generated by `batchRangeProof`. Returns `true` if the proof is valid, `false` otherwise. This function does **not** throw on an invalid proof; a `false` return value indicates a failed verification, not an error.

The `valBase`, `randBase`, and `numBits` values must exactly match the values used when the proof was generated. If they differ, verification will fail (return `false`).

#### Parameters

| Parameter | Type | Description |
|---|---|---|
| `inputs` | `BatchVerifyRangeProofInputs` | See type definition below. |

#### Return value

A `Promise<boolean>`:
- `true` — the proof is valid; all committed values are in `[0, 2^numBits)`.
- `false` — the proof is invalid, or proof deserialization failed.

#### Throws

- If `numBits` is not in `{8, 16, 32, 64}`.
- If any element of `comms` is not exactly 32 bytes.
- Does **not** throw for an invalid or malformed `proof` — returns `false` instead.

#### Example

```typescript
import { batchVerifyProof } from '@aptos-labs/confidential-asset-bindings';

const valid = await batchVerifyProof({
  proof: result.proof,
  comms: result.comms,
  valBase,
  randBase,
  numBits: 32,
});

console.log(valid); // true
```

---

## Types

### `BatchRangeProofInputs`

```typescript
interface BatchRangeProofInputs {
  v: bigint[];
  rs: Uint8Array[];
  valBase: Uint8Array;
  randBase: Uint8Array;
  numBits?: number;
}
```

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `v` | `bigint[]` | Yes | Each element must satisfy `0 <= v[i] < 2^64`. Maximum 16 elements. | The secret values to prove are in range. |
| `rs` | `Uint8Array[]` | Yes | `rs.length` must equal `v.length`. Each element must be exactly 32 bytes. | Blinding factors for the Pedersen commitments. Each is a 32-byte scalar on the Ristretto255 curve. |
| `valBase` | `Uint8Array` | Yes | Exactly 32 bytes; must be a valid compressed Ristretto255 point. | The Pedersen value base point `G` used to form `v * G + r * H`. |
| `randBase` | `Uint8Array` | Yes | Exactly 32 bytes; must be a valid compressed Ristretto255 point. | The Pedersen randomness base point `H` used to form `v * G + r * H`. |
| `numBits` | `number` | No | Must be `8`, `16`, `32`, or `64`. Default: `32`. | The bit width of the proven range. Each value is proven to lie in `[0, 2^numBits)`. |

---

### `BatchRangeProofResult`

```typescript
interface BatchRangeProofResult {
  proof: Uint8Array;
  comms: Uint8Array[];
}
```

| Field | Type | Description |
|---|---|---|
| `proof` | `Uint8Array` | Serialized Bulletproof bytes. Length varies depending on batch size and `numBits`. Pass this directly to `batchVerifyProof` or to on-chain verifier. |
| `comms` | `Uint8Array[]` | Pedersen commitments, one per input value. Each is exactly 32 bytes (a compressed Ristretto255 point). These are the public commitments to the secret values and must be submitted on-chain alongside `proof`. |

---

### `BatchVerifyRangeProofInputs`

```typescript
interface BatchVerifyRangeProofInputs {
  proof: Uint8Array;
  comms: Uint8Array[];
  valBase: Uint8Array;
  randBase: Uint8Array;
  numBits?: number;
}
```

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `proof` | `Uint8Array` | Yes | Must be a serialized Bulletproof from `batchRangeProof`. Malformed bytes cause `false`, not a throw. | The proof to verify. |
| `comms` | `Uint8Array[]` | Yes | Each element must be exactly 32 bytes. | The Pedersen commitments to verify against. Must match the `comms` returned by `batchRangeProof`. |
| `valBase` | `Uint8Array` | Yes | Must match the `valBase` used during proof generation. | The Pedersen value base point. |
| `randBase` | `Uint8Array` | Yes | Must match the `randBase` used during proof generation. | The Pedersen randomness base point. |
| `numBits` | `number` | No | Must be `8`, `16`, `32`, or `64`. Default: `32`. Must match what was used during proof generation. | The range bit width. |

---

## Error Reference

| Error condition | Which function | Throws / Returns false |
|---|---|---|
| `y` is not exactly 32 bytes | `solveDiscreteLog` | Throws |
| `y` is not a valid Ristretto255 point | `solveDiscreteLog` | Throws |
| `maxNumBits` is not `16` or `32` | `solveDiscreteLog` | Throws |
| No discrete log solution found in `[0, 2^maxNumBits)` | `solveDiscreteLog` | Throws |
| `numBits` not in `{8, 16, 32, 64}` | `batchRangeProof`, `batchVerifyProof` | Throws |
| `rs.length !== v.length` | `batchRangeProof` | Throws |
| Any element of `rs` is not exactly 32 bytes | `batchRangeProof` | Throws |
| Any value in `v` is outside `[0, 2^64)` | `batchRangeProof` | Throws |
| Any element of `comms` is not exactly 32 bytes | `batchVerifyProof` | Throws |
| Proof bytes are malformed / cannot be deserialized | `batchVerifyProof` | Returns `false` |
| Proof verification fails | `batchVerifyProof` | Returns `false` |
| Internal Rust error (release builds) | All | Throws with message `"confidential asset operation failed"` |

---

## Compatibility Notes

### Bulletproofs version compatibility

Proofs are generated using **bulletproofs v5.0.0**. The Aptos on-chain verifier (`aptos-core`) uses **bulletproofs v4.0.0**. The proof format produced by this library is intentionally compatible with the v4 verifier, so proofs generated client-side can be submitted to and verified on-chain.

### Domain separation tag

The domain separation tag (DST) `b"AptosConfidentialAsset/BulletproofRangeProof"` is hard-coded into the proof generation and verification logic. This tag must not be changed. Changing it produces proofs that are incompatible with the on-chain verifier.

### WASM initialization

The WASM module initializes lazily on the first call to any function on Web or Node.js. On Node.js, the WASM binary is loaded from `node_modules`; if that fails, it falls back to the unpkg CDN. There is no explicit initialization call required.
