#[cfg(target_os = "ios")]
pub mod ffi;

#[cfg(target_os = "android")]
pub mod jni;
