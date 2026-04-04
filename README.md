# @aptos-labs/confidential-asset-wasm-bindings

WebAssembly bindings for Aptos confidential asset cryptography. Combines discrete log solving and Bulletproof range proofs into a single WASM module, sharing the `curve25519-dalek` dependency to minimize binary size.

## Installation

```bash
npm install @aptos-labs/confidential-asset-wasm-bindings
```

## Usage

```typescript
import init, {
  DiscreteLogSolver,
  range_proof,
  batch_range_proof,
  verify_proof,
  batch_verify_proof,
} from "@aptos-labs/confidential-asset-wasm-bindings";

// Initialize WASM module before calling any functions
await init();
```

### Discrete Log

Solves discrete logarithms on the Ristretto255 curve for 16-bit and 32-bit secrets. Used to decrypt confidential asset balances.

```typescript
const solver = new DiscreteLogSolver();

// y is a compressed Ristretto point (32 bytes): y = g^x
// max_num_bits must be 16 or 32
const x: bigint = solver.solve(y, 32);

console.log(solver.algorithm()); // e.g. "NaiveTruncatedDoubledLookup (16-bit) + TBSGS-k32 (32-bit)"
console.log(solver.max_num_bits()); // [16, 32]
```

### Range Proofs

Zero-knowledge range proofs using Bulletproofs. Proves a value lies in `[0, 2^num_bits)` without revealing it.

```typescript
// Generate a single range proof
// r is a 32-byte blinding scalar
// val_base and rand_base are 32-byte compressed Ristretto points (Pedersen bases)
// num_bits must be 8, 16, 32, or 64
const result = range_proof(value, r, val_base, rand_base, num_bits);
const proofBytes: Uint8Array = result.proof();
const commitment: Uint8Array = result.comm(); // 32 bytes

// Verify a single range proof
const valid: boolean = verify_proof(proofBytes, commitment, val_base, rand_base, num_bits);

// Generate a batch range proof
const batchResult = batch_range_proof(values, blindings, val_base, rand_base, num_bits);
const batchProof: Uint8Array = batchResult.proof();
const commitments: Uint8Array[] = batchResult.comms(); // one per value

// Verify a batch range proof
const batchValid: boolean = batch_verify_proof(batchProof, commitments, val_base, rand_base, num_bits);
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
