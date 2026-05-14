use crate::{
    abi::{
        buffer_from_vec, empty_buffer, take_buffer, ConfidentialAssetBatchRangeProofResult,
        ConfidentialAssetBoolResult, ConfidentialAssetByteBuffer, ConfidentialAssetBytesResult,
    },
    shared::{
        bytes_from_ptr, sanitize_external_error, solver_from_ptr, split_exact_chunks,
        validate_discrete_log_max_num_bits, validate_flat_buffer_len, validate_range_num_bits,
        RANGE_PROOF_BATCH_ELEMENT_BYTES,
    },
};
use aptos_confidential_asset_core::{
    discrete_log::DiscreteLogSolver,
    range_proof::{
        batch_range_proof as core_batch_range_proof, batch_verify_proof as core_batch_verify_proof,
    },
};
use std::ffi::{c_char, c_void, CString};

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
    if let Err(error) = validate_range_num_bits(num_bits) {
        return err_batch(error);
    }

    let values = if values_len == 0 {
        &[][..]
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
        Ok(value) => value,
        Err(error) => return err_batch(error),
    };
    let rand_base = match bytes_from_ptr(rand_base_ptr, rand_base_len) {
        Ok(value) => value,
        Err(error) => return err_batch(error),
    };

    if let Err(error) = validate_flat_buffer_len(
        blindings_flat_len,
        values_len,
        RANGE_PROOF_BATCH_ELEMENT_BYTES,
        "blindings_flat",
    ) {
        return err_batch(error);
    }

    let rs = match split_exact_chunks(
        blindings_flat,
        values_len,
        RANGE_PROOF_BATCH_ELEMENT_BYTES,
        "blindings_flat",
    ) {
        Ok(chunks) => chunks,
        Err(error) => return err_batch(error),
    };

    match core_batch_range_proof(
        values.to_vec(),
        rs,
        val_base.to_vec(),
        rand_base.to_vec(),
        num_bits,
    ) {
        Ok(result) => {
            let count = result.comms.len();
            let comms_flat: Vec<u8> = result.comms.into_iter().flatten().collect();
            ConfidentialAssetBatchRangeProofResult {
                proof: buffer_from_vec(result.proof),
                comms_flat: buffer_from_vec(comms_flat),
                count,
                error: empty_buffer(),
            }
        }
        Err(error) => err_batch(sanitize_external_error(error)),
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
    if let Err(error) = validate_range_num_bits(num_bits) {
        return err_bool(error);
    }

    let proof = match bytes_from_ptr(proof_ptr, proof_len) {
        Ok(value) => value,
        Err(error) => return err_bool(error),
    };
    let comms_flat = match bytes_from_ptr(comms_flat_ptr, comms_flat_len) {
        Ok(value) => value,
        Err(error) => return err_bool(error),
    };
    let val_base = match bytes_from_ptr(val_base_ptr, val_base_len) {
        Ok(value) => value,
        Err(error) => return err_bool(error),
    };
    let rand_base = match bytes_from_ptr(rand_base_ptr, rand_base_len) {
        Ok(value) => value,
        Err(error) => return err_bool(error),
    };

    let comm_count = comms_flat_len / RANGE_PROOF_BATCH_ELEMENT_BYTES;
    let comms = match split_exact_chunks(
        comms_flat,
        comm_count,
        RANGE_PROOF_BATCH_ELEMENT_BYTES,
        "comms_flat",
    ) {
        Ok(chunks) => chunks,
        Err(error) => return err_bool(error),
    };

    match core_batch_verify_proof(
        proof.to_vec(),
        comms,
        val_base.to_vec(),
        rand_base.to_vec(),
        num_bits,
    ) {
        Ok(result) => ok_bool(result),
        Err(error) => err_bool(sanitize_external_error(error)),
    }
}

/// Creates a new `DiscreteLogSolver` and returns an opaque pointer to it.
///
/// The caller must eventually free this pointer with `confidential_asset_free_solver`.
#[no_mangle]
pub extern "C" fn confidential_asset_create_solver() -> *mut c_void {
    Box::into_raw(Box::new(DiscreteLogSolver::new())) as *mut c_void
}

/// Frees a `DiscreteLogSolver` created by `confidential_asset_create_solver`.
#[no_mangle]
pub extern "C" fn confidential_asset_free_solver(ptr: *mut c_void) {
    if !ptr.is_null() {
        unsafe { drop(Box::from_raw(ptr as *mut DiscreteLogSolver)) };
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

    let solver = match solver_from_ptr(ptr) {
        Ok(s) => s,
        Err(error) => return err_bytes(error),
    };
    let y = match bytes_from_ptr(y_ptr, y_len) {
        Ok(value) => value,
        Err(error) => return err_bytes(error),
    };

    match solver.solve(y.to_vec(), max_num_bits) {
        Ok(result) => ok_bytes(result.to_string().into_bytes()),
        Err(error) => err_bytes(sanitize_external_error(error)),
    }
}
