//! C-compatible FFI for discrete log solving and Bulletproof range proofs.
//! Used by iOS (staticlib), Android (JNI), Go, and other native bindings.

#[cfg(not(target_os = "android"))]
pub mod abi;
pub mod bridge;
#[cfg(not(target_os = "android"))]
pub mod ffi;
pub mod shared;

#[cfg(target_os = "android")]
pub mod jni;
