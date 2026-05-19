# aptos_confidential_asset_ffi

C ABI (`staticlib` / `cdylib`) wrapping [`aptos_confidential_asset_core`](../core).

## Header

The canonical C header is [`include/aptos_confidential_asset.h`](include/aptos_confidential_asset.h). To regenerate with [cbindgen](https://github.com/mozilla/cbindgen) after changing Rust signatures:

```bash
cargo install cbindgen
cd rust/ffi
cbindgen --config cbindgen.toml --crate aptos_confidential_asset_ffi --output include/aptos_confidential_asset.h
```

Then sync `ios/Rust/Headers/aptos_confidential_asset.h` if needed.

## Build

```bash
cargo build -p aptos_confidential_asset_ffi --release
```

Static library: `target/release/libaptos_confidential_asset_ffi.a` (macOS/Linux) or `target/release/aptos_confidential_asset_ffi.lib` (Windows MSVC).

Discrete-log algorithm is selected at compile time via Cargo features (`tbsgs_k` default); see [../core/Cargo.toml](../core/Cargo.toml).
