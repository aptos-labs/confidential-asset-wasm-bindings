# @aptos-labs/confidential-asset-bindings

Cross-platform cryptographic library for Aptos confidential assets — discrete log solving over Ristretto255 and Bulletproof range proofs, running on Web, Node.js, iOS, and Android.

## Install

```bash
npm install @aptos-labs/confidential-asset-bindings
```

## Usage

No initialization is required. WASM loads automatically on first call.

### Solve a discrete log

Decrypt a confidential asset balance from a Ristretto255 curve point.

```typescript
import { solveDiscreteLog } from "@aptos-labs/confidential-asset-bindings";

// y is a 32-byte compressed Ristretto255 point
const balance: bigint = await solveDiscreteLog(y, 32);
```

`maxNumBits` must be `16` or `32`.

### Generate a range proof

Prove that values lie in `[0, 2^numBits)` without revealing them.

```typescript
import { batchRangeProof } from "@aptos-labs/confidential-asset-bindings";

const { proof, comms } = await batchRangeProof({
  v: [100n, 200n],                          // values to prove (u64)
  rs: [blindingFactor1, blindingFactor2],   // 32-byte blinding factors; length must equal v.length
  valBase,                                  // 32-byte Pedersen value base point
  randBase,                                 // 32-byte Pedersen randomness base point
  numBits: 32,                              // 8, 16, 32, or 64 (default: 32)
});
```

### Verify a range proof

```typescript
import { batchVerifyProof } from "@aptos-labs/confidential-asset-bindings";

const valid: boolean = await batchVerifyProof({
  proof,
  comms,
  valBase,
  randBase,
  numBits: 32,
});
```

## Cross-version compatibility

Range proofs are generated with Bulletproofs v5.0.0 and are verifiable by v4.0.0 as used in aptos-core. The domain separation tag `b"AptosConfidentialAsset/BulletproofRangeProof"` matches the on-chain verifier exactly, so proofs produced by this library can be submitted directly to the Aptos network.

## Algorithm selection

The discrete log solver algorithm is selected at compile time via Cargo features (WASM builds only). Only one feature may be active at a time.

| Feature | Table Size | WASM Size | Notes |
|---|---|---|---|
| `tbsgs_k` (default) | ~512 KiB | ~774 KiB | Recommended — best size/performance ratio |
| `bsgs_k` | ~2.0 MiB | ~2.1 MiB | Faster, larger |
| `bsgs` | ~2.0 MiB | ~2.1 MiB | Standard BSGS |
| `bl12` | ~258 KiB | ~268 KiB | Smallest, slowest |

To build with a non-default algorithm, pass `--no-default-features --features <name>` to the underlying `wasm-pack` invocation.

## Building from source

Toolchain versions are managed by [mise](https://mise.jdx.dev/). Run `mise install` in the repo root, then:

```bash
npm run build           # full build: Rust → WASM + Android + iOS + JS bundle
npm run build:wasm      # WASM only
npm run build:android   # Android .so files
npm run build:ios       # iOS xcframework
npm run build:lib       # JS/TS bundle (requires pre-built WASM)
```

## Links

- [API Reference](docs/api.md)
- [Examples](docs/examples.md)
- [Advanced usage](docs/advanced.md)
- [Architecture](docs/architecture.md)
- [GitHub repository](https://github.com/aptos-labs/confidential-asset-bindings)
