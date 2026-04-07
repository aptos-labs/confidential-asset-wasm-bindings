# @aptos-labs/confidential-asset-bindings

## 1.0.0

### Major Changes

- a258d0f: Add React Native / Expo native module with full iOS and Android support.

  The package now runs natively on iOS (C FFI → xcframework) and Android (JNI → .so) via Expo's JSI layer, with no WASM involved on mobile. The public API (`solveDiscreteLog`, `batchRangeProof`, `batchVerifyProof`) is identical across all platforms. Web and Node.js continue to use the existing WASM path.

## 0.1.0

### Minor Changes

- 63334cd: Initial release of `@aptos-labs/confidential-asset-bindings`.

  This package provides TypeScript bindings for Aptos confidential asset cryptography.

  ### Discrete Log

  - `solveDiscreteLog(y, maxNumBits)` — solves discrete logarithms on the Ristretto255 curve for 16-bit and 32-bit secrets;
  - Default algorithm: TBSGS-k32 (~774 KiB WASM) — configurable at compile time via Cargo features (`tbsgs_k`, `bsgs_k`, `bsgs`, `bl12`)

  ### Range Proofs (Bulletproofs)

  - `rangeProof(inputs)` / `verifyProof(inputs)` — single range proof generation and verification
  - `batchRangeProof(inputs)` / `batchVerifyProof(inputs)` — batched variants
  - Supports 8, 16, 32, and 64-bit ranges using Pedersen commitments with custom base points
  - Proofs are cross-version compatible with bulletproofs v4.0.0 (as used in aptos-core)

  ### Architecture

  - Pure Rust core (`aptos_confidential_asset_core`) separated from the WASM runtime crate (`aptos_confidential_asset_wasm`) for reusability
  - Ships ESM and CJS bundles with full TypeScript type definitions
