# @aptos-labs/confidential-asset-bindings

Bindings for Aptos confidential asset (discrete log + range proofs).

## Installation

```bash
npm install @aptos-labs/confidential-asset-bindings
```

## Usage

No initialization required — WASM is loaded automatically on first use, from local `node_modules` in Node.js or from the versioned unpkg CDN in browsers.

### Discrete Log

Solves discrete logarithms on the Ristretto255 curve for 16-bit and 32-bit secrets. Used to decrypt confidential asset balances.

```typescript
import { solveDiscreteLog } from "@aptos-labs/confidential-asset-bindings";

// y is a compressed Ristretto point (32 bytes): y = g^x
// maxNumBits must be 16 or 32
const x: bigint = await solveDiscreteLog(y, 32);
```

### Range Proofs

Zero-knowledge range proofs using Bulletproofs. Proves a value lies in `[0, 2^numBits)` without revealing it.

```typescript
import {
  rangeProof,
  batchRangeProof,
  verifyProof,
  batchVerifyProof,
} from "@aptos-labs/confidential-asset-bindings";

// r is a 32-byte blinding scalar
// valBase and randBase are 32-byte compressed Ristretto points (Pedersen bases)
// numBits must be 8, 16, 32, or 64 (default: 32)
const { proof, commitment } = await rangeProof({ v, r, valBase, randBase, numBits });

const valid = await verifyProof({ proof, comm: commitment, valBase, randBase, numBits });

// Batch variants
const { proof: batchProof, commitments } = await batchRangeProof({ v: values, rs: blindings, valBase, randBase, numBits });

const batchValid = await batchVerifyProof({ proof: batchProof, comms: commitments, valBase, randBase, numBits });
```

## Cross-Version Compatibility

Range proofs are generated with bulletproofs v5.0.0 but are verifiable by bulletproofs v4.0.0, which is the version used in aptos-core. This is covered by tests in `rust/core/tests/cross_version_compat.rs`.

## Algorithm Selection

The discrete log algorithm is selected at compile time via Cargo features. Only one feature can be active at a time.

| Feature | Table Size | WASM Size | Notes |
|---------|-----------|-----------|-------|
| `tbsgs_k` (default) | ~512 KiB | ~774 KiB | Recommended: best size/performance ratio |
| `bsgs_k` | ~2.0 MiB | ~2.1 MiB | Faster but larger |
| `bsgs` | ~2.0 MiB | ~2.1 MiB | Standard BSGS |
| `bl12` | ~258 KiB | ~268 KiB | Smallest but slower |

To build with a different algorithm:

```bash
npm run build:wasm -- --no-default-features --features bl12
```

To compare sizes across all variants:

```bash
./scripts/wasm-sizes.sh
```

## Repository Structure

```
confidential-asset-bindings/
├── rust/
│   ├── core/           # Pure Rust: discrete log + range proof logic
│   └── wasm/           # wasm-bindgen bindings wrapping core
├── scripts/
│   └── wasm-sizes.sh   # Build all variants and compare WASM sizes
├── build/              # Intermediate wasm-pack output (gitignored)
├── dist/               # Final npm artifacts
└── tsdown.config.ts    # JS bundler configuration
```

## Building

Requires [mise](https://mise.jdx.dev/) (or manually: Node 22, Rust 1.84+, wasm-pack).

```bash
# Install toolchain versions
mise install

# Build WASM then bundle JS/CJS/types
npm run build

# Build only the WASM
npm run build:wasm

# Bundle JS from existing WASM build
npm run build:js
```

## Testing

```bash
# Run all Rust tests (includes cross-version compatibility)
cargo test --manifest-path rust/Cargo.toml --workspace
```

## License

Apache-2.0
