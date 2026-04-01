use aptos_confidential_asset_core::hello;
use jni::objects::JClass;
use jni::sys::jstring;
use jni::JNIEnv;

#[no_mangle]
pub extern "C" fn Java_com_aptoslabs_confidentialassetsbindings_ConfidentialAssetsBindingsModule_hello(
    env: JNIEnv,
    _class: JClass,
) -> jstring {
    let msg = hello();
    match env.new_string(msg) {
        Ok(value) => value.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}
