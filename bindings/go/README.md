# Go bindings (`aptosconfidential`)

**Experimental.** Module path: `github.com/aptos-labs/confidential-asset-bindings/bindings/go`.

## Prerequisites

- `CGO_ENABLED=1` and a C compiler (Clang/GCC/MSVC).
- Prebuilt static library from this repo:

  ```bash
  cargo build -p aptos_confidential_asset_ffi --release
  # cross-target: add --target aarch64-apple-darwin etc.
  ```

The `cgo_*.go` files pin `rust/target/<Rust-triple>/release/libaptos_confidential_asset_ffi.a` (or `aptos_confidential_asset_ffi.lib` on Windows).

### Install latest released lib (without local Rust build)

From repository root:

```bash
./scripts/install-go-ffi-from-release.sh
```

This detects local `GOOS` / `GOARCH` (and Linux `gnu`/`musl`), downloads the matching asset from the latest GitHub Release, verifies `SHA256SUMS`, and installs it into `rust/target/...` paths expected by `cgo_*.go`.

To pin an explicit release tag:

```bash
./scripts/install-go-ffi-from-release.sh v1.2.3
```

## Use in another module

```go
import "github.com/aptos-labs/confidential-asset-bindings/bindings/go/aptosconfidential"

blindingsFlat, err := aptosconfidential.FlattenBlindings([][]byte{r0, r1})
if err != nil { /* ... */ }
proof, commsFlat, err := aptosconfidential.BatchRangeProof(values, blindingsFlat, valBase32, randBase32, 32)
```

`BatchRangeProof` expects `blindingsFlat` as `len(values)*32` bytes (use `FlattenBlindings` from `[][]byte` blinding factors). For verification with `[][]byte` commitments, use `BatchVerifyProofSlices` or `FlattenComms` + `BatchVerifyProof`.

`numBits` is validated in Go before crossing FFI and must be one of `8, 16, 32, 64`. `Solver.Solve` validates `maxNumBits` (`16` or `32`) and returns an error if the solver is nil/closed.

For long-running services, call `(*Solver).Close()` explicitly when done to release native resources deterministically (finalizer still exists as a fallback).

Cross-binding verify tests use the **Rust-generated** fixture at [`tests/fixtures/golden_batch_range_proof.json`](../../tests/fixtures/golden_batch_range_proof.json) (see `emit_binding_golden_vector` in `aptos_confidential_asset_core`); that is the canonical baseline, not a JS-side vector.

See [examples/go](../../examples/go).

## Platforms covered in-tree

Non-musl builds link `rust/target/release/libaptos_confidential_asset_ffi.a` (or `rust/target/release/aptos_confidential_asset_ffi.lib` on Windows) — i.e. `cargo build -p aptos_confidential_asset_ffi --release` **without** `--target`, on the same machine that runs `go build` / `go test`.

| File | When it applies |
|------|-----------------|
| `cgo_linux_amd64.go` | Linux, amd64, glibc |
| `cgo_linux_arm64.go` | Linux, arm64, glibc |
| `cgo_linux_amd64_musl.go` | Linux, amd64, musl — expects `rust/target/x86_64-unknown-linux-musl/release/...` |
| `cgo_linux_arm64_musl.go` | Linux, arm64, musl — expects `rust/target/aarch64-unknown-linux-musl/release/...` |
| `cgo_darwin_amd64.go` / `cgo_darwin_arm64.go` | macOS (host `target/release`) |
| `cgo_windows_amd64.go` / `cgo_windows_arm64.go` | Windows MSVC (host `target/release`) |

For **cross-compiled** Rust (different `--target`), copy or symlink the `.a` into `rust/target/release/` or add another `cgo_*.go` with the correct path.
