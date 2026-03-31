# Contributing

Contributing to `@aptos-labs/confidential-asset-bindings`.

## Prerequisites

Install [mise](https://mise.jdx.dev/) to manage tool versions, then run:

```bash
mise install
```

This installs the exact Node and Rust versions declared in `.mise.toml`. Alternatively, install them manually: Node 22 and Rust 1.84+, plus [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/).

Install npm dependencies:

```bash
npm install
```

## Building

```bash
# Full build: WASM → JS bundle
npm run build

# WASM only (compiles Rust via wasm-pack)
npm run build:wasm

# JS bundle only (runs tsdown on existing build/wasm output)
npm run build:js
```

Build output:
- `build/wasm/web/` — intermediate wasm-pack output
- `dist/` — final npm package artifacts (ESM, CJS, types, WASM binary)

## Testing

```bash
# Run all Rust tests
cargo test --manifest-path rust/Cargo.toml --workspace
```

The test suite includes cross-version compatibility tests (`rust/core/tests/cross_version_compat.rs`) that verify proofs generated with bulletproofs v5.0.0 can be verified by v4.0.0.

## Project Structure

The Rust code is split into two crates under `rust/`:

- **`rust/core`** — Pure Rust library (`aptos_confidential_asset_core`). No WASM dependencies. Contains all cryptographic logic: discrete log solving and range proof generation/verification.
- **`rust/wasm`** — WASM bindings (`aptos_confidential_asset_wasm`). Thin wrappers around `core` using `wasm-bindgen`. Handles JS serialization and maps errors to `JsError`.

Keep cryptographic logic in `core`. Only add to `wasm` what is needed for the JS interface.

## Discrete Log Algorithms

The discrete log algorithm is selected via a Cargo feature at compile time (only one active at a time):

| Feature | Notes |
|---------|-------|
| `tbsgs_k` (default) | Recommended — best size/performance ratio |
| `bsgs_k` | Faster, larger tables |
| `bsgs` | Standard BSGS |
| `bl12` | Smallest tables, slower |

To compare WASM binary sizes across all variants:

```bash
./scripts/wasm-sizes.sh
```

## Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for versioning.

For any change that affects the published package, add a changeset:

```bash
npm run changeset
```

Follow the prompts to select the bump type and describe the change. Commit the generated `.changeset/*.md` file alongside your code changes.

**Bump type guide:**
- `patch` — bug fixes, internal refactors with no API impact
- `minor` — new functionality, backwards-compatible
- `major` — breaking changes to the public API

Changes that do not require a changeset: CI config, dev tooling, test-only changes, documentation.

## Pull Requests

- Keep PRs focused. One logical change per PR.
- Add a changeset if the published package is affected.
- Ensure `cargo test --workspace` passes before opening a PR.
- PR titles should follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.).
