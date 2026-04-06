#[repr(C)]
pub struct ConfidentialAssetsByteBuffer {
    pub ptr: *mut u8,
    pub len: usize,
    pub capacity: usize,
}

#[repr(C)]
pub struct ConfidentialAssetsRangeProofResult {
    pub proof: ConfidentialAssetsByteBuffer,
    pub comm: ConfidentialAssetsByteBuffer,
    pub error: ConfidentialAssetsByteBuffer,
}

#[repr(C)]
pub struct ConfidentialAssetsBatchRangeProofResult {
    pub proof: ConfidentialAssetsByteBuffer,
    pub comms_flat: ConfidentialAssetsByteBuffer,
    pub count: usize,
    pub error: ConfidentialAssetsByteBuffer,
}

#[repr(C)]
pub struct ConfidentialAssetsBoolResult {
    pub value: bool,
    pub error: ConfidentialAssetsByteBuffer,
}

#[repr(C)]
pub struct ConfidentialAssetsBytesResult {
    pub value: ConfidentialAssetsByteBuffer,
    pub error: ConfidentialAssetsByteBuffer,
}

pub(crate) fn empty_buffer() -> ConfidentialAssetsByteBuffer {
    ConfidentialAssetsByteBuffer {
        ptr: std::ptr::null_mut(),
        len: 0,
        capacity: 0,
    }
}

pub(crate) fn buffer_from_vec(mut value: Vec<u8>) -> ConfidentialAssetsByteBuffer {
    let buffer = ConfidentialAssetsByteBuffer {
        ptr: value.as_mut_ptr(),
        len: value.len(),
        capacity: value.capacity(),
    };
    std::mem::forget(value);
    buffer
}

pub(crate) fn take_buffer(buffer: ConfidentialAssetsByteBuffer) -> Vec<u8> {
    if buffer.ptr.is_null() {
        return Vec::new();
    }

    assert!(buffer.len <= buffer.capacity);
    unsafe { Vec::from_raw_parts(buffer.ptr, buffer.len, buffer.capacity) }
}
