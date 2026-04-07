# Development Guide

## Prerequisites

### Managed setup (recommended)

Install [mise](https://mise.jdx.dev/) and let it provision the exact toolchain versions:

```bash
mise install
```

This installs Node 22.22.2 and Rust 1.94.1 as declared in `.mise.toml`.

### Manual setup

If you prefer to manage tools yourself, install:

- Node.js 22.22.2 (e.g. via `nvm`, `fnm`, or your system package manager)
- Rust 1.94.1 via `rustup`
- wasm-pack — available as an npm dev dependency; see the WASM section below
- cargo-ndk — auto-installed by `build-android.sh` if missing; or `cargo install cargo-ndk`
- xcodebuild and lipo — provided by Xcode on macOS (required for iOS builds only)

## Installing dependencies

```bash
npm install
```

This also makes the locally-pinned `wasm-pack` binary available to build scripts via `npx`.

## Build commands

### Full build

```bash
npm run build
```

Runs all targets in order: WASM, Android, iOS, JS library, Expo module. Requires macOS with Xcode for the iOS step.

### Individual targets

| Command | Output |
|---|---|
| `npm run build:wasm` | `build/wasm/` — WASM pack output |
| `npm run build:android` | `android/src/main/jniLibs/` — pre-built `.so` files |
| `npm run build:ios` | `ios/Rust/Binaries/ConfidentialAsset.xcframework` |
| `npm run build:lib` | `dist/` — ESM, CJS, type declarations, `.wasm` file |
| `npm run build:expo` | Expo native module build |
| `npm run build:bindings` | WASM + Android + iOS only (skips JS) |

`build:lib` requires `build/wasm/` to exist. Run `build:wasm` first if you have not done a full build yet.

### Building WASM with a non-default algorithm feature

`scripts/build-wasm.sh` uses default Cargo features. To build with a specific discrete-log algorithm feature, run `wasm-pack` directly against `rust/wasm`:

```bash
npx wasm-pack build rust/wasm \
  --out-dir ../../build/wasm \
  --target web \
  -- --features <feature-name>
```

Replace `<feature-name>` with the feature flag declared in `rust/wasm/Cargo.toml`. Refer to `rust/core/Cargo.toml` for the list of algorithm features on the core crate.

## Lint and typecheck

```bash
npm run lint          # Biome check (read-only)
npm run lint:fix      # Biome format + auto-fix writes
npm run typecheck     # tsc --noEmit against all tsconfigs
```

Lint and typecheck run together in the `lint-and-typecheck` CI job on every push and pull request to `main`.

## Running tests

### Rust

```bash
cargo test --manifest-path rust/Cargo.toml --workspace
```

Runs all unit and integration tests across all three crates (`core`, `wasm`, `mobile`).

### JavaScript

```bash
npm test
```

Runs the Expo module test suite via `expo-module-scripts`.

## Working with the examples

### Browser (Vite)

```bash
cd examples/browser
npm install
npm run dev
```

Open the URL printed by Vite. The app loads the WASM bundle from `dist/`. Run `npm run build:wasm && npm run build:lib` first if `dist/` is stale.

### Node.js

```bash
cd examples/node
npm install
node index.js   # or whatever the entry script is named
```

### Expo (React Native)

```bash
cd examples/expo
npm install
npx expo run:ios      # or run:android
```

The Expo example links against the built native module. Run `npm run build:android` (and `npm run build:ios` on macOS) from the repo root before running the app.

## Common pitfalls

**iOS builds require macOS and Xcode.** `build-ios.sh` calls `lipo` and `xcodebuild`, which are macOS-only tools. On Linux or Windows, skip the iOS step: `npm run build:bindings` won't work as-is; run `build:wasm` and `build:android` individually.

**`cargo-ndk` is auto-installed if missing.** `build-android.sh` checks for `cargo-ndk` and runs `cargo install cargo-ndk` if it is not found. The first Android build may therefore take longer than expected.

**`wasm-pack` comes from npm devDependencies.** Do not rely on a globally installed `wasm-pack`. The build scripts invoke it via `npx`, which resolves to the version pinned in `package.json`. Running `wasm-pack` directly without `npx` may use a different version.

**`build:lib` fails if WASM output is missing.** `tsdown` copies the `.wasm` file from `build/wasm/` into `dist/`. If you have never run `build:wasm` in the current checkout, `build:lib` will fail. Always run `build:wasm` (or `build`) before `build:lib`.
