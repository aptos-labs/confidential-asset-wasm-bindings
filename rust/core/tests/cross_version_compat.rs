//! Cross-version compatibility tests for Bulletproofs.
//!
//! These tests verify that proofs generated with bulletproofs v5.0.0 (using curve25519-dalek v4)
//! can be correctly verified by bulletproofs v4.0.0 (using curve25519-dalek-ng v4).
//!
//! This is critical because aptos-core uses bulletproofs v4.0.0 for on-chain verification,
//! while we want to upgrade the WASM to use bulletproofs v5.0.0 for proof generation.

use bulletproofs::{BulletproofGens, PedersenGens, RangeProof};
use curve25519_dalek::ristretto::RistrettoPoint;
use curve25519_dalek::scalar::Scalar;
use merlin::Transcript;
use once_cell::sync::Lazy;
use rand::rngs::OsRng;

// Import v4 versions for verification
use bulletproofs_v4::BulletproofGens as BulletproofGensV4;
use bulletproofs_v4::PedersenGens as PedersenGensV4;
use bulletproofs_v4::RangeProof as RangeProofV4;
use curve25519_dalek_ng::ristretto::CompressedRistretto as CompressedRistrettoV4;
use merlin::Transcript as TranscriptV4;

const MAX_RANGE_BITS: usize = 64;
const DST: &[u8] = b"AptosConfidentialAsset/BulletproofRangeProof";

// Generators for v5 (proof generation)
static GENERATORS_V5: Lazy<BulletproofGens> =
    Lazy::new(|| BulletproofGens::new(MAX_RANGE_BITS, 16));

// Generators for v4 (verification - simulates aptos-core)
static GENERATORS_V4: Lazy<BulletproofGensV4> =
    Lazy::new(|| BulletproofGensV4::new(MAX_RANGE_BITS, 16));

/// Generates a single range proof using bulletproofs v5.0.0
fn generate_proof_v5(
    value: u64,
    num_bits: usize,
) -> (Vec<u8>, Vec<u8>, RistrettoPoint, RistrettoPoint) {
    // Use default Pedersen generators
    let pg = PedersenGens::default();

    // Random blinding factor
    let blinding = Scalar::random(&mut OsRng);

    let mut transcript = Transcript::new(DST);

    let (proof, commitment) = RangeProof::prove_single(
        &GENERATORS_V5,
        &pg,
        &mut transcript,
        value,
        &blinding,
        num_bits,
    )
    .expect("Failed to generate proof");

    (
        proof.to_bytes(),
        commitment.to_bytes().to_vec(),
        pg.B,          // val_base
        pg.B_blinding, // rand_base
    )
}

/// Generates a batch range proof using bulletproofs v5.0.0
fn generate_batch_proof_v5(
    values: &[u64],
    num_bits: usize,
) -> (Vec<u8>, Vec<Vec<u8>>, RistrettoPoint, RistrettoPoint) {
    let pg = PedersenGens::default();

    // Random blinding factors
    let blindings: Vec<Scalar> = (0..values.len())
        .map(|_| Scalar::random(&mut OsRng))
        .collect();

    let mut transcript = Transcript::new(DST);

    let (proof, commitments) = RangeProof::prove_multiple(
        &GENERATORS_V5,
        &pg,
        &mut transcript,
        values,
        &blindings,
        num_bits,
    )
    .expect("Failed to generate batch proof");

    let comm_bytes: Vec<Vec<u8>> = commitments.iter().map(|c| c.to_bytes().to_vec()).collect();

    (proof.to_bytes(), comm_bytes, pg.B, pg.B_blinding)
}

/// Verifies a single range proof using bulletproofs v4.0.0
/// This simulates what aptos-core does on-chain.
fn verify_proof_v4(
    proof_bytes: &[u8],
    commitment_bytes: &[u8],
    val_base: &RistrettoPoint,
    rand_base: &RistrettoPoint,
    num_bits: usize,
) -> bool {
    // Convert v5 points to v4 points by going through compressed bytes
    let val_base_bytes = val_base.compress().to_bytes();
    let rand_base_bytes = rand_base.compress().to_bytes();

    let val_base_v4 = CompressedRistrettoV4::from_slice(&val_base_bytes)
        .decompress()
        .expect("Failed to decompress val_base for v4");
    let rand_base_v4 = CompressedRistrettoV4::from_slice(&rand_base_bytes)
        .decompress()
        .expect("Failed to decompress rand_base for v4");

    let pg_v4 = PedersenGensV4 {
        B: val_base_v4,
        B_blinding: rand_base_v4,
    };

    // Parse commitment
    let commitment_v4 = CompressedRistrettoV4::from_slice(commitment_bytes);

    // Parse proof
    let proof_v4 = match RangeProofV4::from_bytes(proof_bytes) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("Failed to deserialize proof with v4: {:?}", e);
            return false;
        }
    };

    // Verify
    let mut transcript = TranscriptV4::new(DST);
    proof_v4
        .verify_single(
            &GENERATORS_V4,
            &pg_v4,
            &mut transcript,
            &commitment_v4,
            num_bits,
        )
        .is_ok()
}

/// Verifies a batch range proof using bulletproofs v4.0.0
fn verify_batch_proof_v4(
    proof_bytes: &[u8],
    commitment_bytes: &[Vec<u8>],
    val_base: &RistrettoPoint,
    rand_base: &RistrettoPoint,
    num_bits: usize,
) -> bool {
    // Convert v5 points to v4 points
    let val_base_bytes = val_base.compress().to_bytes();
    let rand_base_bytes = rand_base.compress().to_bytes();

    let val_base_v4 = CompressedRistrettoV4::from_slice(&val_base_bytes)
        .decompress()
        .expect("Failed to decompress val_base for v4");
    let rand_base_v4 = CompressedRistrettoV4::from_slice(&rand_base_bytes)
        .decompress()
        .expect("Failed to decompress rand_base for v4");

    let pg_v4 = PedersenGensV4 {
        B: val_base_v4,
        B_blinding: rand_base_v4,
    };

    // Parse commitments
    let commitments_v4: Vec<CompressedRistrettoV4> = commitment_bytes
        .iter()
        .map(|bytes| CompressedRistrettoV4::from_slice(bytes))
        .collect();

    // Parse proof
    let proof_v4 = match RangeProofV4::from_bytes(proof_bytes) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("Failed to deserialize batch proof with v4: {:?}", e);
            return false;
        }
    };

    // Verify
    let mut transcript = TranscriptV4::new(DST);
    proof_v4
        .verify_multiple(
            &GENERATORS_V4,
            &pg_v4,
            &mut transcript,
            &commitments_v4,
            num_bits,
        )
        .is_ok()
}

// ============================================================================
// Single proof tests
// ============================================================================

#[test]
fn single_proof_8bit_verifies_with_v4() {
    let value = 255u64; // max 8-bit value
    let (proof, commitment, val_base, rand_base) = generate_proof_v5(value, 8);

    assert!(
        verify_proof_v4(&proof, &commitment, &val_base, &rand_base, 8),
        "8-bit proof generated with v5 should verify with v4"
    );
}

#[test]
fn single_proof_16bit_verifies_with_v4() {
    let value = 65535u64; // max 16-bit value
    let (proof, commitment, val_base, rand_base) = generate_proof_v5(value, 16);

    assert!(
        verify_proof_v4(&proof, &commitment, &val_base, &rand_base, 16),
        "16-bit proof generated with v5 should verify with v4"
    );
}

#[test]
fn single_proof_32bit_verifies_with_v4() {
    let value = 4294967295u64; // max 32-bit value
    let (proof, commitment, val_base, rand_base) = generate_proof_v5(value, 32);

    assert!(
        verify_proof_v4(&proof, &commitment, &val_base, &rand_base, 32),
        "32-bit proof generated with v5 should verify with v4"
    );
}

#[test]
fn single_proof_64bit_verifies_with_v4() {
    let value = u64::MAX;
    let (proof, commitment, val_base, rand_base) = generate_proof_v5(value, 64);

    assert!(
        verify_proof_v4(&proof, &commitment, &val_base, &rand_base, 64),
        "64-bit proof generated with v5 should verify with v4"
    );
}

#[test]
fn single_proof_zero_verifies_with_v4() {
    let value = 0u64;
    let (proof, commitment, val_base, rand_base) = generate_proof_v5(value, 64);

    assert!(
        verify_proof_v4(&proof, &commitment, &val_base, &rand_base, 64),
        "Zero value proof generated with v5 should verify with v4"
    );
}

#[test]
fn single_proof_random_values_verify_with_v4() {
    use rand::Rng;
    let mut rng = OsRng;

    for num_bits in [8, 16, 32, 64] {
        let max_value = if num_bits == 64 {
            u64::MAX
        } else {
            (1u64 << num_bits) - 1
        };

        for _ in 0..3 {
            let value = rng.gen_range(0..=max_value);
            let (proof, commitment, val_base, rand_base) = generate_proof_v5(value, num_bits);

            assert!(
                verify_proof_v4(&proof, &commitment, &val_base, &rand_base, num_bits),
                "Random {}-bit value {} proof should verify with v4",
                num_bits,
                value
            );
        }
    }
}

// ============================================================================
// Batch proof tests
// ============================================================================

#[test]
fn batch_proof_2_values_verifies_with_v4() {
    let values = vec![100u64, 200u64];
    let (proof, commitments, val_base, rand_base) = generate_batch_proof_v5(&values, 16);

    assert!(
        verify_batch_proof_v4(&proof, &commitments, &val_base, &rand_base, 16),
        "Batch-2 proof generated with v5 should verify with v4"
    );
}

#[test]
fn batch_proof_4_values_verifies_with_v4() {
    let values = vec![100u64, 200u64, 300u64, 400u64];
    let (proof, commitments, val_base, rand_base) = generate_batch_proof_v5(&values, 16);

    assert!(
        verify_batch_proof_v4(&proof, &commitments, &val_base, &rand_base, 16),
        "Batch-4 proof generated with v5 should verify with v4"
    );
}

#[test]
fn batch_proof_8_values_verifies_with_v4() {
    let values = vec![
        100u64, 200u64, 300u64, 400u64, 500u64, 600u64, 700u64, 800u64,
    ];
    let (proof, commitments, val_base, rand_base) = generate_batch_proof_v5(&values, 16);

    assert!(
        verify_batch_proof_v4(&proof, &commitments, &val_base, &rand_base, 16),
        "Batch-8 proof generated with v5 should verify with v4"
    );
}

#[test]
fn batch_proof_16_values_verifies_with_v4() {
    let values: Vec<u64> = (0..16).map(|i| i * 100).collect();
    let (proof, commitments, val_base, rand_base) = generate_batch_proof_v5(&values, 16);

    assert!(
        verify_batch_proof_v4(&proof, &commitments, &val_base, &rand_base, 16),
        "Batch-16 proof generated with v5 should verify with v4"
    );
}

#[test]
fn batch_proof_mixed_bit_sizes_verify_with_v4() {
    for num_bits in [8, 16, 32, 64] {
        let max_value = if num_bits == 64 {
            u64::MAX
        } else {
            (1u64 << num_bits) - 1
        };

        let values = vec![0, 1, max_value / 2, max_value];
        let (proof, commitments, val_base, rand_base) = generate_batch_proof_v5(&values, num_bits);

        assert!(
            verify_batch_proof_v4(&proof, &commitments, &val_base, &rand_base, num_bits),
            "Batch-4 {}-bit proof should verify with v4",
            num_bits
        );
    }
}

// ============================================================================
// Edge case tests
// ============================================================================

#[test]
fn proof_format_is_identical() {
    // Verify that the proof byte format is the same between versions
    // by checking that v4 can deserialize proofs from v5
    let value = 12345u64;
    let (proof_bytes, _, _, _) = generate_proof_v5(value, 32);

    // Should not panic
    let proof_v4 = RangeProofV4::from_bytes(&proof_bytes)
        .expect("v4 should be able to deserialize v5 proof bytes");

    // Re-serialize with v4 and compare
    let reserialized = proof_v4.to_bytes();
    assert_eq!(
        proof_bytes, reserialized,
        "Proof bytes should be identical after round-trip through v4"
    );
}

#[test]
fn commitment_format_is_identical() {
    // Verify that compressed Ristretto point encoding is the same between v4 and v5

    // Generate a random point with v5
    let scalar = Scalar::random(&mut OsRng);
    let point_v5 = RistrettoPoint::mul_base(&scalar);
    let compressed_v5 = point_v5.compress();
    let bytes_v5 = compressed_v5.to_bytes();

    // Parse with v4
    let compressed_v4 = CompressedRistrettoV4::from_slice(&bytes_v5);
    let point_v4 = compressed_v4
        .decompress()
        .expect("v4 should decompress v5 point");

    // Re-compress with v4 and compare
    let bytes_v4 = point_v4.compress().to_bytes();
    assert_eq!(
        bytes_v5, bytes_v4,
        "Compressed point encoding should be identical between v4 and v5"
    );
}
