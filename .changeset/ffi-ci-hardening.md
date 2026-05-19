---
"@aptos-labs/confidential-asset-bindings": patch
---

Harden CI and release: require changesets for `rust/ffi`, add Android JNI compile smoke, publish `aarch64-unknown-linux-musl` FFI artifacts, verify FFI git tags match `package.json`, serialize native solver calls with a mutex, and unify npm publish with automatic `v*` tag + native FFI GitHub Release (`release.yml` → `bindings-release.yml`).
