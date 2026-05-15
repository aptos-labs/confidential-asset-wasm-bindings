//! C-compatible FFI for discrete log solving and Bulletproof range proofs.
//! Used by iOS (staticlib), Android (JNI), Go, and other native bindings.

pub mod abi;
pub mod bridge;
pub mod ffi;
pub mod shared;

#[cfg(target_os = "android")]
pub mod jni;
