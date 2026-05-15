# Project Structure

## Annotated directory tree

```
confidential-asset-bindings/
├── rust/                        # All Rust source code (Cargo workspace)
│   ├── Cargo.toml               # Workspace root — declares the three member crates
│   ├── core/                    # Pure crypto library; no platform dependencies
│   │   ├── Cargo.toml           # crate: aptos_confidential_asset_core
│   │   └── src/
│   │       ├── lib.rs           # Crate root; re-exports public types
│   │       ├── discrete_log.rs  # DiscreteLogSolver — algorithm selected via Cargo features
│   │       └── range_proof.rs   # batch_range_proof, batch_verify_proof
│   │   └── tests/
│   │       └── cross_version_compat.rs  # Bulletproofs v5→v4 compatibility tests
│   ├── wasm/                    # WASM platform wrapper
│   │   ├── Cargo.toml           # crate: aptos_confidential_asset_wasm
│   │   └── src/
│   │       ├── lib.rs           # WASM init + panic hook
│   │       ├── discrete_log.rs  # wasm-bindgen wrapper for DiscreteLogSolver
│   │       └── range_proof.rs   # wasm-bindgen wrappers for batch_range_proof/batch_verify_proof
│   └── ffi/                     # C ABI + iOS/Android native (also used by Go)
│       ├── Cargo.toml           # crate: aptos_confidential_asset_ffi
│       ├── include/             # cbindgen header (aptos_confidential_asset.h)
│       └── src/
│           ├── bridge.rs        # Shared Rust logic (C + JNI call into core)
│           ├── shared.rs        # Validation helpers and flat-buffer utilities
│           ├── abi.rs           # C-compatible result structs (#[repr(C)])
│           ├── ffi.rs           # extern "C" #[no_mangle] entry points
│           └── jni.rs           # Android only: JNI entry points
│
├── src/                         # TypeScript library source
│   ├── index.ts                 # Web/Node.js entry — loads WASM and exports public API
│   ├── index.native.ts          # React Native entry — validates inputs, calls JSI native module
│   ├── types.ts                 # Shared TypeScript types (BatchRangeProofInputs, etc.)
│   ├── ConfidentialAssetBindingsModule.ts   # Expo native module declaration (JSI bridge)
│   ├── ConfidentialAssetBindings.types.ts   # Expo template types (boilerplate, not part of public API)
│   └── ConfidentialAssetBindingsView.tsx    # Expo template view component (not used by library)
│
├── android/
│   └── src/main/jniLibs/        # Pre-built .so files for arm64-v8a, armeabi-v7a, x86_64
│
├── ios/
│   └── Rust/
│       ├── Headers/             # (optional) legacy; build uses rust/ffi/include
│       └── Binaries/
│           └── ConfidentialAsset.xcframework/  # Universal XCFramework (device + simulator slices)
│
├── examples/
│   ├── browser/                 # Vite application showing browser/WASM usage
│   ├── node/                    # Node.js example
│   └── expo/                    # React Native / Expo example application
│
├── scripts/
│   ├── build-wasm.sh            # wasm-pack build → build/wasm/
│   ├── build-android.sh         # cargo-ndk build → android/src/main/jniLibs/
│   ├── build-ios.sh             # cargo + lipo + xcodebuild → ios/ XCFramework
│   └── wasm-sizes.sh            # Builds all four WASM feature variants and prints a size comparison
│
├── build/                       # Intermediate wasm-pack output (gitignored)
├── dist/                        # Published npm artifacts: ESM, CJS, .d.ts, .wasm (gitignored)
│
├── .changeset/                  # Changesets config + pending changeset files
├── .github/
│   └── workflows/
│       ├── ci.yml               # lint+typecheck, test-rust, test-js, build jobs
│       └── release.yml          # changesets/action — creates Version PR or publishes to npm
│
├── biome.json                   # Biome linter/formatter config
├── tsconfig.json                # Root TypeScript config
├── tsconfig.lib.json            # TypeScript config for the library build (used by tsdown)
├── tsdown.config.ts             # tsdown bundler config (produces dist/)
├── expo-module.config.json      # Expo module config (platforms: apple, android, web)
├── .mise.toml                   # Pins Node 22.22.2 and Rust 1.94.1
├── package.json
├── CHANGELOG.md
├── README.md
└── CONTRIBUTING.md
```

## The three Rust crates

### `aptos_confidential_asset_core` (`rust/core`)

The cryptographic foundation of the library. Contains:

- `DiscreteLogSolver` — solves the discrete log problem needed to decrypt confidential balances. The algorithm is selected at compile time via Cargo features, enabling different speed/memory trade-offs.
- `batch_range_proof` / `batch_verify_proof` — Bulletproof range proof generation and verification.

This crate has zero dependencies on wasm-bindgen, JNI, or any FFI. All correctness tests and compatibility tests live here.

### `aptos_confidential_asset_wasm` (`rust/wasm`)

A thin wasm-bindgen wrapper around `core`. It:

- Initialises the WASM module and installs a panic hook that forwards Rust panics to the browser console.
- Re-exports `DiscreteLogSolver`, `batch_range_proof`, and `batch_verify_proof` with `#[wasm_bindgen]` annotations so they are callable from JavaScript.

Built by `scripts/build-wasm.sh` using `wasm-pack`.

### `aptos_confidential_asset_ffi` (`rust/ffi`)

Canonical native bindings for **Go**, **iOS** (C FFI / XCFramework), and **Android** (JNI). Responsibilities:

- `bridge.rs` — pure Rust calls into `core` (single algorithm path for C and JNI).
- `shared.rs` — input validation and flat-buffer utilities.
- `abi.rs` + `ffi.rs` — `#[repr(C)]` result types and `extern "C" #[no_mangle]` functions (Go + iOS).
- `jni.rs` (Android only) — JNI entry points for the Expo native module.

Header: `rust/ffi/include/aptos_confidential_asset.h` (cbindgen). iOS builds embed this via `scripts/build-ios.sh`; Android loads `libaptos_confidential_asset_ffi.so`.

## TypeScript source (`src/`)

The `src/` directory contains two distinct entry points for the two runtime environments:

- **`index.ts`** — Used on web and Node.js. Loads the WASM binary (built by `build:wasm`), initialises the module, and exports the public API by calling into the WASM functions.
- **`index.native.ts`** — Used on React Native via Metro's platform-specific resolution (`*.native.ts` wins over `*.ts`). Validates inputs with the same rules as the Rust side, then delegates to the JSI native module declared in `ConfidentialAssetBindingsModule.ts`.

`types.ts` defines the shared input/output types (`BatchRangeProofInputs`, `BatchRangeProofResult`, `BatchVerifyRangeProofInputs`) used by both entry points.

`ConfidentialAssetBindingsModule.ts` is the Expo native module declaration. It describes the JSI interface that bridges TypeScript to the native Rust code on iOS and Android.

The remaining files (`ConfidentialAssetBindings.types.ts`, `ConfidentialAssetBindingsView.tsx`) are Expo module scaffolding and are not part of the library's public API.

## Build artifacts

### `build/` — intermediate, gitignored

Produced by `wasm-pack` during `build:wasm`. Contains the raw WASM binary, JS glue, and TypeScript bindings before they are processed by `tsdown`. Never committed.

### `dist/` — published package, gitignored

Produced by `build:lib` (tsdown) and included in the npm package. Contains:

- ESM and CJS bundles
- TypeScript declaration files (`.d.ts`)
- The compiled `.wasm` binary (copied from `build/wasm/`)

`dist/` is not committed to the repository. It is produced during the release CI run and uploaded to npm directly.
