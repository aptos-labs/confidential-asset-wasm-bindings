#[repr(C)]
pub struct ConfidentialAssetByteBuffer {
    pub ptr: *mut u8,
    pub len: usize,
    pub capacity: usize,
}

#[repr(C)]
pub struct ConfidentialAssetBatchRangeProofResult {
    pub proof: ConfidentialAssetByteBuffer,
    pub comms_flat: ConfidentialAssetByteBuffer,
    pub count: usize,
    pub error: ConfidentialAssetByteBuffer,
}

#[repr(C)]
pub struct ConfidentialAssetBoolResult {
    pub value: bool,
    pub error: ConfidentialAssetByteBuffer,
}

#[repr(C)]
pub struct ConfidentialAssetBytesResult {
    pub value: ConfidentialAssetByteBuffer,
    pub error: ConfidentialAssetByteBuffer,
}

pub(crate) fn empty_buffer() -> ConfidentialAssetByteBuffer {
    ConfidentialAssetByteBuffer {
        ptr: std::ptr::null_mut(),
        len: 0,
        capacity: 0,
    }
}

pub(crate) fn buffer_from_vec(mut value: Vec<u8>) -> ConfidentialAssetByteBuffer {
    let buffer = ConfidentialAssetByteBuffer {
        ptr: value.as_mut_ptr(),
        len: value.len(),
        capacity: value.capacity(),
    };
    std::mem::forget(value);
    buffer
}

pub(crate) fn take_buffer(buffer: ConfidentialAssetByteBuffer) -> Vec<u8> {
    if buffer.ptr.is_null() {
        return Vec::new();
    }

    assert!(buffer.len <= buffer.capacity);
    unsafe { Vec::from_raw_parts(buffer.ptr, buffer.len, buffer.capacity) }
}
