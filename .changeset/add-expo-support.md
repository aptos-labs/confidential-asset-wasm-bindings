---
"@aptos-labs/confidential-asset-bindings": major
---

Add React Native / Expo native module with full iOS and Android support.

The package now runs natively on iOS (C FFI → xcframework) and Android (JNI → .so) via Expo's JSI layer, with no WASM involved on mobile. The public API (`solveDiscreteLog`, `batchRangeProof`, `batchVerifyProof`) is identical across all platforms. Web and Node.js continue to use the existing WASM path.
