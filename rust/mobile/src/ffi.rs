use aptos_confidential_asset_core::hello;
use std::ffi::CString;
use std::os::raw::c_char;

#[no_mangle]
pub extern "C" fn confidential_asset_hello() -> *const c_char {
    let msg = hello();
    let c_string = CString::new(msg).unwrap();
    c_string.into_raw()
}

#[no_mangle]
pub extern "C" fn confidential_asset_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        unsafe {
            drop(std::ffi::CString::from_raw(ptr));
        }
    }
}
