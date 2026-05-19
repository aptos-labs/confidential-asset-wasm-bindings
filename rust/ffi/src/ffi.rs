use crate::{
    abi::{
        buffer_from_vec, empty_buffer, take_buffer, ConfidentialAssetBatchRangeProofResult,
        ConfidentialAssetBoolResult, ConfidentialAssetByteBuffer, ConfidentialAssetBytesResult,
    },
    bridge,
    shared::validate_discrete_log_max_num_bits,
};
use aptos_confidential_asset_core::discrete_log::DiscreteLogSolver;
use std::ffi::{c_char, c_void, CString};
use std::sync::Mutex;

fn ok_bytes(value: Vec<u8>) -> ConfidentialAssetBytesResult {
    ConfidentialAssetBytesResult {
        value: buffer_from_vec(value),
        error: empty_buffer(),
    }
}

fn err_bytes(message: String) -> ConfidentialAssetBytesResult {
    ConfidentialAssetBytesResult {
        value: empty_buffer(),
        error: buffer_from_vec(message.into_bytes()),
    }
}

fn err_batch(message: String) -> ConfidentialAssetBatchRangeProofResult {
    ConfidentialAssetBatchRangeProofResult {
        proof: empty_buffer(),
        comms_flat: empty_buffer(),
        count: 0,
        error: buffer_from_vec(message.into_bytes()),
    }
}

fn ok_bool(value: bool) -> ConfidentialAssetBoolResult {
    ConfidentialAssetBoolResult {
        value,
        error: empty_buffer(),
    }
}

fn err_bool(message: String) -> ConfidentialAssetBoolResult {
    ConfidentialAssetBoolResult {
        value: false,
        error: buffer_from_vec(message.into_bytes()),
    }
}

fn bytes_from_ptr<'a>(ptr: *const u8, len: usize) -> Result<&'a [u8], String> {
    if len == 0 {
        return Ok(&[]);
    }

    if ptr.is_null() {
        return Err("received null pointer with non-zero length".to_string());
    }

    // The C caller owns this memory. We only borrow it for the duration of this FFI call.
    Ok(unsafe { std::slice::from_raw_parts(ptr, len) })
}

#[no_mangle]
pub extern "C" fn confidential_asset_free_cstring(ptr: *mut c_char) {
    if !ptr.is_null() {
        unsafe { drop(CString::from_raw(ptr)) };
    }
}

#[no_mangle]
pub extern "C" fn confidential_asset_free_buffer(buffer: ConfidentialAssetByteBuffer) {
    let _ = take_buffer(buffer);
}

/// Generates a batch Bulletproof range proof.
///
/// `blindings_flat` is a concatenation of 32-byte blinding factors (one per value).
#[no_mangle]
pub extern "C" fn confidential_asset_batch_range_proof(
    values_ptr: *const u64,
    values_len: usize,
    blindings_flat_ptr: *const u8,
    blindings_flat_len: usize,
    val_base_ptr: *const u8,
    val_base_len: usize,
    rand_base_ptr: *const u8,
    rand_base_len: usize,
    num_bits: usize,
) -> ConfidentialAssetBatchRangeProofResult {
    let values: &[u64] = if values_len == 0 {
        &[]
    } else if values_ptr.is_null() {
        return err_batch("received null values pointer with non-zero length".to_string());
    } else {
        unsafe { std::slice::from_raw_parts(values_ptr, values_len) }
    };
    let blindings_flat = match bytes_from_ptr(blindings_flat_ptr, blindings_flat_len) {
        Ok(value) => value,
        Err(error) => return err_batch(error),
    };
    let val_base = match bytes_from_ptr(val_base_ptr, val_base_len) {
        Ok(value) => value.to_vec(),
        Err(error) => return err_batch(error),
    };
    let rand_base = match bytes_from_ptr(rand_base_ptr, rand_base_len) {
        Ok(value) => value.to_vec(),
        Err(error) => return err_batch(error),
    };

    match bridge::batch_range_proof(values, blindings_flat, val_base, rand_base, num_bits) {
        Ok(result) => ConfidentialAssetBatchRangeProofResult {
            proof: buffer_from_vec(result.proof),
            comms_flat: buffer_from_vec(result.comms_flat),
            count: result.count,
            error: empty_buffer(),
        },
        Err(error) => err_batch(error),
    }
}

/// Verifies a batch range proof.
///
/// `comms_flat` is a concatenation of 32-byte commitments (one per value).
#[no_mangle]
pub extern "C" fn confidential_asset_batch_verify_proof(
    proof_ptr: *const u8,
    proof_len: usize,
    comms_flat_ptr: *const u8,
    comms_flat_len: usize,
    val_base_ptr: *const u8,
    val_base_len: usize,
    rand_base_ptr: *const u8,
    rand_base_len: usize,
    num_bits: usize,
) -> ConfidentialAssetBoolResult {
    let proof = match bytes_from_ptr(proof_ptr, proof_len) {
        Ok(value) => value.to_vec(),
        Err(error) => return err_bool(error),
    };
    let comms_flat = match bytes_from_ptr(comms_flat_ptr, comms_flat_len) {
        Ok(value) => value,
        Err(error) => return err_bool(error),
    };
    let val_base = match bytes_from_ptr(val_base_ptr, val_base_len) {
        Ok(value) => value.to_vec(),
        Err(error) => return err_bool(error),
    };
    let rand_base = match bytes_from_ptr(rand_base_ptr, rand_base_len) {
        Ok(value) => value.to_vec(),
        Err(error) => return err_bool(error),
    };

    match bridge::batch_verify_proof(proof, comms_flat, val_base, rand_base, num_bits) {
        Ok(result) => ok_bool(result),
        Err(error) => err_bool(error),
    }
}

/// Creates a new `DiscreteLogSolver` and returns an opaque pointer to it.
///
/// The caller must eventually free this pointer with `confidential_asset_free_solver`.
#[no_mangle]
pub extern "C" fn confidential_asset_create_solver() -> *mut c_void {
    Box::into_raw(Box::new(Mutex::new(bridge::create_solver()))) as *mut c_void
}

/// Frees a `DiscreteLogSolver` created by `confidential_asset_create_solver`.
#[no_mangle]
pub extern "C" fn confidential_asset_free_solver(ptr: *mut c_void) {
    if !ptr.is_null() {
        unsafe { drop(Box::from_raw(ptr as *mut Mutex<DiscreteLogSolver>)) };
    }
}

/// Solves the discrete log problem using the given solver.
///
/// Returns the result as a UTF-8 decimal string (to avoid precision loss with u64).
#[no_mangle]
pub extern "C" fn confidential_asset_solver_solve(
    ptr: *mut c_void,
    y_ptr: *const u8,
    y_len: usize,
    max_num_bits: u8,
) -> ConfidentialAssetBytesResult {
    if let Err(error) = validate_discrete_log_max_num_bits(usize::from(max_num_bits)) {
        return err_bytes(error);
    }

    if ptr.is_null() {
        return err_bytes("received null solver pointer".to_string());
    }
    let mutex = unsafe { &*(ptr as *const Mutex<DiscreteLogSolver>) };
    let solver = match mutex.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    let y = match bytes_from_ptr(y_ptr, y_len) {
        Ok(value) => value.to_vec(),
        Err(error) => return err_bytes(error),
    };

    match bridge::solver_solve(&*solver, y, max_num_bits) {
        Ok(result) => ok_bytes(result.to_string().into_bytes()),
        Err(error) => err_bytes(error),
    }
}
