---
"@aptos-labs/confidential-asset-wasm-bindings": minor
---

Initial release of `@aptos-labs/confidential-asset-wasm-bindings`.

This package provides unified WebAssembly bindings for Aptos confidential asset cryptography, combining discrete log solving and Bulletproof range proofs into a single WASM module to minimize binary size by sharing the `curve25519-dalek` dependency.

### Discrete Log Solver

- Solves discrete logarithms on the Ristretto255 curve for 16-bit and 32-bit secrets
- Exposes a `DiscreteLogSolver` class with precomputed lookup tables
- Default algorithm: TBSGS-k32 (~774 KiB WASM) — configurable at compile time via Cargo features for different size/performance trade-offs (`tbsgs_k`, `bsgs_k`, `bsgs`, `bl12`)

### Range Proofs (Bulletproofs)

- Single and batch range proof generation and verification via `range_proof`, `batch_range_proof`, `verify_proof`, and `batch_verify_proof`
- Supports 8, 16, 32, and 64-bit ranges using Pedersen commitments with custom base points
- Proofs are cross-version compatible with bulletproofs v4.0.0 (as used in aptos-core)

### Architecture

- Pure Rust core (`aptos_confidential_asset_core`) separated from WASM bindings (`aptos_confidential_asset_wasm`) for reusability
- Ships ESM and CJS bundles with full TypeScript type definitions
