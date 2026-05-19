# Go example

Requires **CGO**, a C toolchain, and a prebuilt static library at `rust/target/release/` (see below).

```bash
# from repository root — unsets a global CARGO_TARGET_DIR so outputs land in rust/target/
./scripts/build-ffi-for-bindings.sh

cd examples/go
go test -v .
go run .
```

If your environment sets `CARGO_TARGET_DIR` outside the repo, either unset it for this workspace or set it to `$(pwd)/rust/target` before building.

The binding selects `rust/target/<triple>/release/libaptos_confidential_asset_ffi.a` by `GOOS`/`GOARCH` (and `musl` where applicable); see `bindings/go/aptosconfidential/cgo_*.go`.
