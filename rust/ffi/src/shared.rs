use aptos_confidential_asset_core::discrete_log::DiscreteLogSolver;
use std::ffi::c_void;

pub const RANGE_PROOF_BATCH_ELEMENT_BYTES: usize = 32;
pub const DISCRETE_LOG_MAX_NUM_BITS_16: usize = 16;
pub const DISCRETE_LOG_MAX_NUM_BITS_32: usize = 32;

pub fn solver_from_ptr<'a>(ptr: *mut c_void) -> Result<&'a DiscreteLogSolver, String> {
    if ptr.is_null() {
        return Err("received null solver pointer".to_string());
    }
    Ok(unsafe { &*(ptr as *const DiscreteLogSolver) })
}

pub fn bytes_from_ptr<'a>(ptr: *const u8, len: usize) -> Result<&'a [u8], String> {
    if len == 0 {
        return Ok(&[]);
    }

    if ptr.is_null() {
        return Err("received null pointer with non-zero length".to_string());
    }

    Ok(unsafe { std::slice::from_raw_parts(ptr, len) })
}

pub fn validate_range_num_bits(num_bits: usize) -> Result<(), String> {
    match num_bits {
        8 | 16 | 32 | 64 => Ok(()),
        _ => Err(format!(
            "invalid num_bits: {}. Must be one of 8, 16, 32, or 64.",
            num_bits
        )),
    }
}

pub fn validate_discrete_log_max_num_bits(max_num_bits: usize) -> Result<u8, String> {
    match max_num_bits {
        DISCRETE_LOG_MAX_NUM_BITS_16 => Ok(DISCRETE_LOG_MAX_NUM_BITS_16 as u8),
        DISCRETE_LOG_MAX_NUM_BITS_32 => Ok(DISCRETE_LOG_MAX_NUM_BITS_32 as u8),
        _ => Err(format!(
            "invalid max_num_bits: {}. Must be one of 16 or 32.",
            max_num_bits
        )),
    }
}

pub fn validate_flat_buffer_len(
    flat_len: usize,
    expected_count: usize,
    element_size: usize,
    label: &str,
) -> Result<(), String> {
    let expected_len = expected_count.checked_mul(element_size).ok_or_else(|| {
        format!(
            "{} length overflow for count {} and element size {}",
            label, expected_count, element_size
        )
    })?;

    if flat_len != expected_len {
        return Err(format!(
            "{} must contain exactly {} bytes ({} elements of {} bytes), got {}",
            label, expected_len, expected_count, element_size, flat_len
        ));
    }

    Ok(())
}

pub fn split_exact_chunks(
    flat: &[u8],
    expected_count: usize,
    element_size: usize,
    label: &str,
) -> Result<Vec<Vec<u8>>, String> {
    validate_flat_buffer_len(flat.len(), expected_count, element_size, label)?;

    let mut chunks = flat.chunks_exact(element_size);
    let values = chunks
        .by_ref()
        .map(|chunk| chunk.to_vec())
        .collect::<Vec<_>>();
    if !chunks.remainder().is_empty() {
        return Err(format!(
            "{} must be divisible into {}-byte chunks",
            label, element_size
        ));
    }

    Ok(values)
}

#[cfg(debug_assertions)]
pub fn sanitize_external_error(message: impl Into<String>) -> String {
    message.into()
}

#[cfg(not(debug_assertions))]
pub fn sanitize_external_error(_message: impl Into<String>) -> String {
    "confidential asset operation failed".to_string()
}

#[cfg(test)]
mod tests {
    use super::{
        split_exact_chunks, validate_discrete_log_max_num_bits, validate_flat_buffer_len,
        validate_range_num_bits, RANGE_PROOF_BATCH_ELEMENT_BYTES,
    };

    #[test]
    fn validate_range_num_bits_accepts_supported_values() {
        for num_bits in [8, 16, 32, 64] {
            assert!(validate_range_num_bits(num_bits).is_ok());
        }
    }

    #[test]
    fn validate_range_num_bits_rejects_unsupported_values() {
        for num_bits in [0, 1, 24, 65] {
            assert!(validate_range_num_bits(num_bits).is_err());
        }
    }

    #[test]
    fn validate_discrete_log_max_num_bits_accepts_supported_values() {
        for num_bits in [16, 32] {
            assert_eq!(validate_discrete_log_max_num_bits(num_bits), Ok(num_bits as u8));
        }
    }

    #[test]
    fn validate_discrete_log_max_num_bits_rejects_unsupported_values() {
        for num_bits in [0, 8, 24, 64, 255] {
            assert!(validate_discrete_log_max_num_bits(num_bits).is_err());
        }
    }

    #[test]
    fn validate_flat_buffer_len_accepts_exact_length() {
        assert!(
            validate_flat_buffer_len(64, 2, RANGE_PROOF_BATCH_ELEMENT_BYTES, "comms_flat").is_ok()
        );
    }

    #[test]
    fn validate_flat_buffer_len_rejects_non_divisible_length() {
        let error = validate_flat_buffer_len(33, 1, RANGE_PROOF_BATCH_ELEMENT_BYTES, "comms_flat")
            .expect_err("expected length mismatch");
        assert!(error.contains("comms_flat"));
    }

    #[test]
    fn split_exact_chunks_rejects_count_mismatch() {
        let flat = vec![0u8; 64];
        let error =
            split_exact_chunks(&flat, 1, RANGE_PROOF_BATCH_ELEMENT_BYTES, "blindings_flat")
                .expect_err("expected count mismatch");
        assert!(error.contains("blindings_flat"));
    }

    #[test]
    fn validate_flat_buffer_len_rejects_multiplication_overflow() {
        let error = validate_flat_buffer_len(
            usize::MAX,
            usize::MAX,
            RANGE_PROOF_BATCH_ELEMENT_BYTES,
            "blindings_flat",
        )
        .expect_err("expected overflow");
        assert!(error.contains("overflow"));
    }
}
