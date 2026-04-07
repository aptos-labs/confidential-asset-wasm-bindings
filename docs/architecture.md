# Architecture Overview

This document describes the internal structure of `@aptos-labs/confidential-asset-bindings` for developers who are extending, porting, or debugging the library.

---

## High-level layer diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: TypeScript public API                                 │
│                                                                 │
│  src/index.ts              src/index.native.ts                  │
│  (web / Node.js)           (React Native)                       │
│      │                         │                               │
│      │ WASM JS bindings         │ JSI / Expo native module      │
│      ▼                         ▼                               │
├──────────────────┬──────────────────────────────────────────────┤
│  Layer 2a: WASM  │  Layer 2b: Mobile bindings                  │
│                  │                                              │
│  rust/wasm/      │  rust/mobile/                               │
│  wasm-bindgen    │  src/ffi.rs  (iOS, extern "C")              │
│  JS class        │  src/jni.rs  (Android, JNI)                 │
│  wrappers        │  src/abi.rs  (C-compatible structs)         │
│                  │  src/shared.rs (validation, packing)        │
├──────────────────┴──────────────────────────────────────────────┤
│  Layer 1: Rust core                                             │
│                                                                 │
│  rust/core/  (crate: aptos_confidential_asset_core)            │
│  src/discrete_log.rs   DiscreteLogSolver                       │
│  src/range_proof.rs    batch_range_proof / batch_verify_proof  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why the three-layer split

**Testability.** The Rust core has no platform dependencies. Its tests (including `rust/core/tests/cross_version_compat.rs`) run with `cargo test` on any host without a WASM runtime, an Android emulator, or an iOS simulator. Cryptographic correctness is verified at this layer independently of the delivery mechanism.

**Reuse.** Both WASM and mobile bindings import the same `aptos_confidential_asset_core` crate. Proof generation and discrete log logic are never duplicated. A bug fix in `range_proof.rs` propagates to all platforms in the same build.

**Isolation.** WASM-specific code (wasm-bindgen attributes, panic hooks, JS class shape) is confined to `rust/wasm`. Platform-specific code (C repr structs, `extern "C"` functions, JNI name mangling) is confined to `rust/mobile`. Neither leaks into the core crate.

---

## Build pipelines

### WASM pipeline

```
rust/core/
  └─ aptos_confidential_asset_core (lib)
        │
        ▼
rust/wasm/
  └─ aptos_confidential_asset_wasm (lib, crate-type = ["cdylib"])
     src/discrete_log.rs   (#[wasm_bindgen] class wrapper)
     src/range_proof.rs    (#[wasm_bindgen] free functions)
        │
        ▼  wasm-pack build --target web --release
build/wasm/
  aptos_confidential_asset_wasm.js          (JS glue, wasm-bindgen generated)
  aptos_confidential_asset_wasm_bg.wasm     (compiled WASM binary)
  aptos_confidential_asset_wasm.d.ts        (TypeScript declarations)
        │
        ▼  tsdown (bundler)
dist/
  index.mjs     (ESM bundle, imports .wasm via URL)
  index.cjs     (CJS bundle)
  *.d.ts        (TypeScript declarations)
  aptos_confidential_asset_wasm_bg.wasm     (copied to dist/)
```

The `#[wasm_bindgen(start)]` function in `rust/wasm/src/lib.rs` installs a panic hook at module initialization time. Without this hook, Rust panics surface as opaque `RuntimeError: unreachable` in the browser console with no useful message. With the hook, panics are forwarded to `console.error` with the panic message and source location.

### iOS pipeline

```
rust/core/
  └─ aptos_confidential_asset_core (lib)
        │
        ▼
rust/mobile/
  └─ aptos_confidential_asset_mobile (lib, crate-type = ["staticlib"])
     src/abi.rs      (repr(C) structs for all return types)
     src/shared.rs   (validation, flat-buffer pack/unpack)
     src/ffi.rs      (#[cfg(target_os = "ios")], #[no_mangle] extern "C")
        │
        ▼  cargo build --target aarch64-apple-ios --release
           cargo build --target aarch64-apple-ios-sim --release
           cargo build --target x86_64-apple-ios --release
           lipo (merge sim slices into fat binary)
        │
        ▼  xcodebuild -create-xcframework
build/ios/
  ConfidentialAssetBindings.xcframework/
    ios-arm64/                    (device slice)
    ios-arm64_x86_64-simulator/   (simulator fat slice)
        │
        ▼  Expo module (ios/ directory)
           Swift/ObjC wrapper that links xcframework,
           exposes functions to React Native via JSI
```

### Android pipeline

```
rust/core/
  └─ aptos_confidential_asset_core (lib)
        │
        ▼
rust/mobile/
  └─ aptos_confidential_asset_mobile (lib, crate-type = ["cdylib"])
     src/shared.rs   (validation, flat-buffer pack/unpack)
     src/jni.rs      (#[cfg(target_os = "android")], JNI entry points)
        │
        ▼  cargo-ndk -t arm64-v8a -t armeabi-v7a -t x86_64 build --release
build/android/
  jniLibs/
    arm64-v8a/     libconfidential_asset_bindings.so
    armeabi-v7a/   libconfidential_asset_bindings.so
    x86_64/        libconfidential_asset_bindings.so
        │
        ▼  Expo module (android/ directory)
           Kotlin class ConfidentialAssetBindingsModule (TurboModule)
           loads .so via System.loadLibrary,
           exposes functions to React Native via JSI
```

---

## The flat-buffer convention

FFI and JNI boundaries do not support nested arrays or Rust's `Vec<Vec<u8>>` type. Passing a variable number of variable-length byte slices requires a convention.

**The convention:** pack all items sequentially into a single flat byte buffer and pass a separate `count` integer.

For items with a fixed size (e.g., 32-byte Ristretto255 points):

```
input: [item_0 (32 bytes)][item_1 (32 bytes)][item_2 (32 bytes)]
count: 3
```

The Rust side slices `flat_buffer.chunks_exact(ITEM_SIZE).take(count)` to reconstruct the individual items. If `flat_buffer.len() != count * ITEM_SIZE`, the function returns an error immediately.

For items with variable size (e.g., proof blobs), the same pattern applies but each item must be padded to the maximum expected size, or an additional length-prefix array must be passed. The current implementation uses fixed-size items throughout.

Values that represent currency amounts are serialized as little-endian u64 bytes (8 bytes each) before packing, matching the encoding used by aptos-core.

This convention must be followed by any caller that bypasses the TypeScript API and calls the native functions directly.

---

## Error sanitization design

Internal Rust errors can contain information that should not reach production callers: memory addresses, internal type names, unexpected input values, or hints about the system state. The `sanitize_external_error()` helper in `rust/mobile/src/shared.rs` addresses this.

```
debug build  (debug_assertions = true)
  → error message passed through unchanged
  → full details visible in development and test

release build (debug_assertions = false)
  → error message replaced with "confidential asset operation failed"
  → internal details are not exposed
```

The WASM layer uses the same approach via the wasm-bindgen error type, which becomes a JavaScript `Error` with the sanitized message string.

All error paths in `ffi.rs` and `jni.rs` go through `sanitize_external_error()` before constructing the result struct or JNI string. There is no path from Rust to the caller that bypasses this gate.

---

## DiscreteLogSolver lifetime across platforms

The solver holds precomputed Baby-Step Giant-Step tables in memory. The table size and load cost make it impractical to recreate on every call.

| Platform     | Creation point             | Storage             | Destruction |
|--------------|----------------------------|---------------------|-------------|
| WASM         | First `solveDiscreteLog()` | WASM linear memory  | Never (page lifetime) |
| iOS          | `confidential_asset_create_solver()` | Rust heap via `*mut c_void` | `confidential_asset_free_solver()` — called on explicit cleanup |
| Android      | `createSolver()` JNI call  | Rust heap via `jlong` | `freeSolver(handle)` — exists but not called by public API |

The Android and iOS public TypeScript/Swift APIs both treat the solver as an app-lifetime singleton. The `freeSolver` function exists for completeness and for callers that want explicit lifecycle control, but the default assumption is that the solver is created once and never freed.

---

## Cross-version bulletproof compatibility

The Rust core generates proofs using `bulletproofs` v5.0.0 but must produce output that can be verified by `bulletproofs` v4.0.0, which is the version embedded in aptos-core at the time of writing.

Two parameters are protocol constants that must match exactly between generator and verifier:

**Domain separation tag:**
```rust
pub static BULLETPROOF_DST: &[u8] = b"AptosConfidentialAsset/BulletproofRangeProof";
```

**Generator configuration:**
```rust
// lazy_static — created once, shared across calls
BulletproofGens::new(64, 16)  // max_bitsize=64, max_parties=16
```

Both values are checked in `rust/core/tests/cross_version_compat.rs`, which generates a proof with the v5 code path and verifies it with the v4 code path in the same test binary. This test must pass before any release. If either value is changed, the test will fail, and proofs generated by this library will be rejected by the on-chain verifier.

---

## Algorithm selection via Cargo features

The `DiscreteLogSolver` algorithm is selected at compile time via Cargo features on the `aptos_confidential_asset_core` crate. There is no runtime switch.

| Feature      | Algorithm          | Table size  | Recommended use            |
|--------------|--------------------|-------------|----------------------------|
| `tbsgs_k`    | Tabulated BSGS (k) | ~512 KiB    | Default. Good for 16 and 32-bit. |
| `bsgs`       | Classic BSGS       | < 512 KiB   | Smaller memory, slower 32-bit solves. |
| `bl12`       | 12-bit baby step   | Minimal     | Smallest WASM bundle, 12-bit values only. |

Only one algorithm feature should be active per build. The default feature set enables `tbsgs_k`. To override, pass `--no-default-features --features <feature>` to both the `rust/wasm` and `rust/mobile` builds.

---

## TypeScript entry point routing

The `package.json` exports map determines which entry point is loaded depending on the consumer's environment:

```json
{
  "exports": {
    ".": {
      "react-native": "./dist/index.native.js",
      "import":       "./dist/index.mjs",
      "require":      "./dist/index.cjs"
    }
  }
}
```

**Condition resolution order matters.** `react-native` is checked first. Metro (the React Native bundler) declares the `react-native` condition, so it always resolves to `index.native.js`. Web bundlers (Vite, webpack, esbuild) and Node.js do not declare `react-native`, so they fall through to `import` or `require`.

`index.native.ts` has no WASM dependency. It validates inputs, serializes them to flat buffers following the convention described above, and delegates to `ConfidentialAssetBindingsModule` — the Expo TurboModule declared in `src/ConfidentialAssetBindingsModule.ts`. The TurboModule declaration describes the JSI interface but contains no implementation; the implementation lives in the native iOS/Android code.

`index.ts` (the web/Node.js entry) has no native module dependency. It loads the WASM binary, wraps the wasm-bindgen exports in a small async initialization guard, and exposes the same public API surface as the native entry point.

Both entry points export identical function signatures. A caller cannot tell at the TypeScript level which backend is in use.
