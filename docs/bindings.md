# Native bindings (Go)

Experimental **Go** bindings over the same cryptographic core as the npm package (`@aptos-labs/confidential-asset-bindings`).

## Version alignment

- **npm / JS** remains the primary semver surface (`package.json`).
- **Go module**: `github.com/aptos-labs/confidential-asset-bindings/bindings/go` (use your fork path with `replace` when needed).
- **Native FFI static libraries** ship on **GitHub Releases** (not npm). After each successful **npm** publish, [`release.yml`](../.github/workflows/release.yml) pushes git tag **`vX.Y.Z`**, which runs **[`bindings-release.yml`](../.github/workflows/bindings-release.yml)** and publishes the staticlibs + `SHA256SUMS` for the same semver as `package.json` (no separate manual tagging in the default flow).

## Rust layout

Native bindings (Go, iOS, Android) share a single crate — no separate `mobile` crate.

| Crate | Role |
|-------|------|
| [`aptos_confidential_asset_core`](../rust/core) | Pure crypto (Bulletproofs + discrete log) |
| [`aptos_confidential_asset_ffi`](../rust/ffi) | C ABI + Android JNI (`staticlib` / `cdylib`) — **canonical for Go, iOS, Android** |

C header: [`rust/ffi/include/aptos_confidential_asset.h`](../rust/ffi/include/aptos_confidential_asset.h).

## Building the static library

From the repository root:

```bash
./scripts/build-ffi-for-bindings.sh
```

Or manually (ensure `CARGO_TARGET_DIR` is unset so outputs land under `rust/target/release/`):

```bash
cargo build -p aptos_confidential_asset_ffi --release --manifest-path rust/Cargo.toml
```

## Cross-binding parity

- **Single implementation:** Go calls **`aptos_confidential_asset_ffi`** (same `aptos_confidential_asset_core` as WASM/JS). No duplicate Bulletproofs logic in Go.
- **Golden fixture:** [`tests/fixtures/golden_batch_range_proof.json`](../tests/fixtures/golden_batch_range_proof.json) is produced by Rust (`emit_binding_golden_vector`). Go tests verify that fixture and round-trip prove→verify.
- **Local check:** `./scripts/check-binding-parity.sh` runs Rust golden + Go golden tests (requires built FFI staticlib).

Regenerate the fixture:

```bash
cargo run --manifest-path rust/Cargo.toml --example emit_binding_golden_vector -p aptos_confidential_asset_core
```

## Go

See [bindings/go/README.md](../bindings/go/README.md) and [examples/go](../examples/go).

Install a prebuilt static library from GitHub Releases (must match a published triple — see below):

```bash
./scripts/install-go-ffi-from-release.sh vX.Y.Z
```

## CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs **Bindings (FFI + Go)** on Ubuntu (`go-bindings-smoke`): build FFI, `go test` in `bindings/go`, smoke test in `examples/go`. **Android JNI (FFI arm64-v8a)** cross-compiles the same crate with `cargo-ndk` + NDK so JNI code is exercised on every Linux PR. Together with lint / JS / Rust tests / macOS full build this gates merges to `main`.

Repository admins should mark **Bindings (FFI + Go)** and **Android JNI (FFI arm64-v8a)** as **required** checks under branch protection for `main`.

## Releases (FFI binaries)

**One release path:** merging **Version Packages** triggers `npm run release` on `main`; when publish succeeds, **`release.yml`** pushes **`vX.Y.Z`**, which runs **Release native FFI binaries** and creates the GitHub Release with prebuilt `libaptos_confidential_asset_ffi` archives and **`SHA256SUMS`**. Changelog for npm remains in `CHANGELOG.md`; the GitHub Release is the native-FFI asset bundle.

Use **Actions → Release native FFI binaries** (`workflow_dispatch`) only as a fallback (e.g. draft rebuild) — see [releasing.md](contributors/releasing.md).

### Prebuilt triples (GitHub Release matrix)

Published by [`bindings-release.yml`](../.github/workflows/bindings-release.yml):

| Target | Notes |
|--------|--------|
| `x86_64-unknown-linux-gnu` | glibc Linux amd64 |
| `aarch64-unknown-linux-gnu` | glibc Linux arm64 |
| `x86_64-unknown-linux-musl` | musl Linux amd64 |
| `aarch64-unknown-linux-musl` | musl Linux arm64 |
| `aarch64-apple-darwin` | Apple Silicon macOS |
| `x86_64-pc-windows-msvc` | Windows amd64 |

**Not published today:** `x86_64-apple-darwin` (Intel Mac — CI matrix disabled), `aarch64-pc-windows-msvc` (Windows arm64). On those hosts, build from source with `cargo build -p aptos_confidential_asset_ffi --release` (add `--target` when cross-compiling).

`install-go-ffi-from-release.sh` only supports triples that appear in the table above.

## Platform matrix (prebuilt artifacts)

The repository **does not** commit `.a` / `.lib` binaries; consumers download release assets or build from source.
