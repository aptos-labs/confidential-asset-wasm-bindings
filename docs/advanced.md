# Advanced Guide

This document covers internal mechanics that matter when you are extending, debugging, or deploying `@aptos-labs/confidential-asset-bindings`. It assumes you have already integrated the library and are familiar with its public API.

---

## WASM initialization lifecycle

The WASM module is initialized lazily — nothing is loaded or compiled until the first API call is made. The loader in `src/index.ts` uses a single promise variable to deduplicate concurrent calls:

```
first call
  → initPromise is null → create initPromise → fetch + compile WASM
  → subsequent calls while loading → await the same initPromise (no duplicate fetch)
  → on success → initialized = true, initPromise kept for future awaits
  → on failure → initPromise reset to null so the next call retries
```

Key implications:

- **No side effects on import.** Bundlers that import the package but never call a function will not trigger WASM loading.
- **Retry on transient failure.** If the CDN is temporarily unreachable, the next call will attempt initialization again rather than staying in a permanently broken state.
- **Thread-safe by construction** on the web — JavaScript is single-threaded so the promise reference swap is atomic.

The first call may take 50–200 ms depending on network speed (browser CDN path) or filesystem read speed (Node.js local path). All subsequent calls hit the `initialized = true` fast path and add no overhead.

---

## DiscreteLogSolver singleton pattern

The `DiscreteLogSolver` struct holds precomputed lookup tables in memory. Loading those tables is a one-time cost that must not be paid on every `solveDiscreteLog` call.

### WASM (web/Node.js)

A single JS-side solver object is created on the first call and reused for the lifetime of the page or process. Because the WASM module is a singleton, the solver's backing memory lives inside the WASM linear memory and is never freed.

### iOS

`confidential_asset_create_solver()` allocates a `DiscreteLogSolver` on the Rust heap and returns a `*mut c_void` opaque pointer. The Swift/ObjC layer stores this pointer and passes it back on each `confidential_asset_solver_solve()` call. `confidential_asset_free_solver()` must be called to release the memory, though in practice the solver is created once at app startup and lives for the app's lifetime.

### Android

`createSolver()` returns a `jlong` containing the raw pointer cast to an integer. The JS layer (via JSI) stores this handle and passes it back to `solverSolve(handle, ...)`. `freeSolver(handle)` exists on the native module but **is not called by the public API** — the solver intentionally lives for the duration of the app process. This is a deliberate simplification; if you add lifecycle-aware cleanup, call `freeSolver` in your component's teardown or in `AppRegistry.registerComponent` cleanup.

### Why a singleton matters

Destroying and recreating the solver between calls would reload the precomputed tables from scratch on every invocation, adding hundreds of milliseconds of latency. The singleton amortizes that cost to a one-time startup payment.

---

## Performance characteristics

### Solver initialization

Table loading happens once, on the first `solveDiscreteLog` call (or on `createSolver()` for the native path). It is not part of the module initialization step. Budget for this separately if you are measuring first-call latency.

### Discrete log solve times (approximate)

| Bit width | Algorithm  | Typical time    |
|-----------|------------|-----------------|
| 16-bit    | tbsgs_k    | < 10 ms         |
| 32-bit    | tbsgs_k    | 200–500 ms      |
| 32-bit    | bsgs       | 1–3 s           |

These are order-of-magnitude estimates on a modern mobile device. Actual timing depends on device speed and whether the lookup tables are already warm in CPU cache.

### Algorithm selection tradeoff

`tbsgs_k` (the default) is the recommended algorithm. It uses roughly 512 KiB of precomputed tables and offers good performance for both 16-bit and 32-bit solves. The plain `bsgs` algorithm uses less memory but is significantly slower for 32-bit values. Algorithm selection is a **compile-time Cargo feature** — you cannot switch algorithms at runtime. See the Cargo features section in architecture.md.

### Range proofs

- **Proof generation is significantly slower than verification.** Expect proof generation to take several hundred milliseconds for a full batch; verification is typically an order of magnitude faster.
- **Batch proofs are more efficient per-value than individual proofs.** The bulletproof protocol shares computation across values in a batch, so proving 8 values in one call is faster than 8 individual calls.
- **Maximum batch size is 16 values.** This is enforced by the `BulletproofGens::new(64, 16)` generator configuration. Passing more than 16 values will produce an error.

---

## WASM size optimization

The default build includes all algorithm variants. To minimize bundle size, build with only the `bl12` feature enabled:

```sh
wasm-pack build --target web --release -- --no-default-features --features bl12
```

`bl12` selects the 12-bit baby-step table variant, which has the smallest precomputed table and produces a smaller WASM binary. Use this only if your application exclusively handles small balance values (< 2^12). For general use, `tbsgs_k` is more appropriate despite the larger binary.

---

## Browser: CDN loading, CSP, and self-hosting

### CDN loading

In browser environments, the WASM binary is loaded from the versioned unpkg CDN:

```
https://unpkg.com/@aptos-labs/confidential-asset-bindings@{version}/dist/aptos_confidential_asset_wasm_bg.wasm
```

The URL is version-pinned, so updating the npm package automatically pulls the matching WASM binary.

### Content Security Policy requirements

If your application enforces a CSP, you must allow:

- `wasm-unsafe-eval` in your `script-src` directive (required to compile and instantiate any WASM module)
- The unpkg origin in your `connect-src` directive: `https://unpkg.com`

Example CSP fragment:

```
Content-Security-Policy: script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' https://unpkg.com;
```

### Self-hosting the WASM file

To avoid the CDN dependency entirely (for air-gapped environments, stricter CSP, or reduced latency), copy `dist/aptos_confidential_asset_wasm_bg.wasm` from the npm package into your own static asset directory and override the fetch URL before the first API call. Consult `src/index.ts` for the exact initialization hook — pass a custom `moduleOrPath` to the WASM init function if you need to point at a local URL or an `ArrayBuffer` you have already fetched.

---

## React Native specifics

### JSI and New Architecture requirement

The native module uses JSI (JavaScript Interface) for synchronous, low-overhead calls from JS to native code. JSI requires the **New Architecture** (Fabric + TurboModules) to be enabled in the host application. The module will not load in a Hermes environment with the Old Architecture.

To enable the New Architecture, set `newArchEnabled=true` in your app's `gradle.properties` (Android) and `RCT_NEW_ARCH_ENABLED=1` in the iOS build environment.

### Package export routing

The `react-native` condition in `package.json` exports routes to `dist/index.native.js` instead of the WASM-backed entry point. This routing happens at bundle time via Metro. No runtime detection is involved — if Metro resolves the wrong entry point, verify that the `react-native` condition is declared before `import` and `require` in your Metro config's `resolverMainFields` or `unstable_enablePackageExports` setting.

### Solver lifetime in React Native

The solver is created on first use and held alive for the app process. `freeSolver()` is declared on the native module interface but is never called by the public API. This is intentional — the memory cost of the solver tables is fixed and small enough to hold for the app lifetime. If you implement explicit lifecycle management, call `ConfidentialAssetBindingsModule.freeSolver(handle)` in your cleanup path.

---

## Android specifics

### Supported ABIs

The `.so` shared libraries are compiled for:

- `arm64-v8a` — 64-bit ARM (primary modern target)
- `armeabi-v7a` — 32-bit ARM (older devices)
- `x86_64` — x86 64-bit (emulator)

If your app's `abiFilters` in `build.gradle` excludes any of these, the corresponding devices will fail to load the native library.

### Flat-buffer protocol (JNI)

JNI does not support nested arrays or variable-length array-of-arrays types across the boundary. All multi-value inputs are packed into a single flat byte buffer with an explicit count parameter.

Example: passing 3 Ristretto255 commitments (each 32 bytes):

```
comms_flat = [byte_0 ... byte_31][byte_32 ... byte_63][byte_64 ... byte_95]
count = 3
```

The Rust JNI layer uses the count to slice the flat buffer into individual 32-byte chunks. If you are calling the native functions directly (bypassing the TypeScript API), you must pack and unpack following this convention. Values are serialized as little-endian u64 bytes before crossing the JNI boundary.

---

## iOS specifics

### xcframework layout

The xcframework bundles two slices:

- `aarch64-apple-ios` — device slice (64-bit ARM)
- Fat binary: `aarch64-apple-ios-sim` + `x86_64-apple-ios` — simulator slice

The simulator fat binary lets both Apple Silicon Macs (arm64 sim) and Intel Macs (x86_64 sim) run simulator builds from the same xcframework.

### Flat-buffer protocol (FFI)

The same flat-buffer convention used in JNI applies to the C FFI layer. `ConfidentialAssetByteBuffer` wraps a pointer + length for returning heap-allocated byte data from Rust to Swift/ObjC. Always call `confidential_asset_free_buffer()` to release buffers returned by Rust, and `confidential_asset_free_cstring()` for any error strings. Failure to do so is a memory leak.

Result structs use `#[repr(C)]` to guarantee a stable, C-compatible memory layout. Do not reorder or add fields without updating both the Rust definition and the Swift/ObjC consuming code.

---

## Error message behavior

### Release builds

`sanitize_external_error()` replaces the original Rust error message with the generic string:

```
confidential asset operation failed
```

This prevents internal implementation details (stack traces, internal type names, input values) from leaking to callers in production.

### Debug builds

The original error message is preserved. This is controlled by a `cfg!(debug_assertions)` check inside `sanitize_external_error()`. When building with `--release`, `debug_assertions` is false and sanitization is active.

If you are debugging a production issue and need the original messages, rebuild with `--profile dev` or add `[profile.release] debug-assertions = true` to your `Cargo.toml` temporarily.

---

## Cross-version compatibility

### The DST must not change

The bulletproof domain separation tag is:

```rust
pub static BULLETPROOF_DST: &[u8] = b"AptosConfidentialAsset/BulletproofRangeProof";
```

This tag is embedded in every proof. **aptos-core uses the same tag for on-chain verification.** Changing the DST produces proofs that will be rejected by the chain. Treat this value as a protocol constant, not a configuration parameter.

### Generator parameters must match aptos-core

`BulletproofGens::new(64, 16)` configures generators for up to 64-bit values and a maximum batch size of 16. Both values must match what aptos-core expects. Changing either parameter breaks proof/verify compatibility with on-chain contracts.

### Bulletproofs version cross-compatibility

Proofs are generated using `bulletproofs` crate **v5.0.0** but are designed to be verifiable by **v4.0.0**, which is the version used by aptos-core on-chain. This cross-version compatibility is tested in `rust/core/tests/cross_version_compat.rs`. Do not modify proof generation in ways that rely on v5-only wire format changes without verifying that the v4 verifier still accepts the output.
