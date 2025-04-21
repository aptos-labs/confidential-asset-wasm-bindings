use bulletproofs::PedersenGens;
use curve25519_dalek_ng::ristretto::CompressedRistretto;
use curve25519_dalek_ng::scalar::Scalar;
use merlin::Transcript;
use std::error::Error;
use std::fmt;

// Application modules
use crate::{BULLETPROOF_DST, BULLETPROOF_GENERATORS};

pub struct NativeBatchRangeProof {
    pub(crate) proof: Vec<u8>,
    pub(crate) comms: Vec<Vec<u8>>,
}

// Implement getter methods for `NativeBatchedRangeProof`
impl NativeBatchRangeProof {
    pub fn proof(&self) -> Vec<u8> {
        self.proof.clone()
    }

    pub fn comms(&self) -> Vec<Vec<u8>> {
        self.comms.clone()
    }
}

// Define a custom Error type
#[derive(Debug)]
pub struct BatchRangeProofError {
    details: String,
}

impl BatchRangeProofError {
    pub fn new(msg: &str) -> BatchRangeProofError {
        BatchRangeProofError {
            details: msg.to_string(),
        }
    }
}

impl fmt::Display for BatchRangeProofError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.details)
    }
}

impl Error for BatchRangeProofError {}

pub fn _batch_range_proof(
    v: Vec<u64>,
    rs: Vec<Vec<u8>>, // Vec<u8> for each randomizer
    val_base: Vec<u8>,
    rand_base: Vec<u8>,
    num_bits: usize,
) -> Result<NativeBatchRangeProof, BatchRangeProofError> {
    // Validate and convert `val_base` into [u8; 32]
    let val_base: [u8; 32] = val_base
        .try_into()
        .map_err(|_| BatchRangeProofError::new("`val_base` must be exactly 32 bytes long"))?;

    // Validate and convert `rand_base` into [u8; 32]
    let rand_base: [u8; 32] = rand_base
        .try_into()
        .map_err(|_| BatchRangeProofError::new("`rand_base` must be exactly 32 bytes long"))?;

    // Convert `rs` from Vec<Vec<u8>> to Vec<[u8; 32]>
    let r: Vec<[u8; 32]> = rs
        .iter()
        .map(|arr| {
            arr.to_vec()
                .try_into()
                .map_err(|_| BatchRangeProofError::new("Each element in `rs` must be exactly 32 bytes"))
        })
        .collect::<Result<Vec<[u8; 32]>, _>>()?;

    // Construct Pedersen generators
    let pg = PedersenGens {
        B: CompressedRistretto(val_base).decompress()
            .ok_or_else(|| BatchRangeProofError::new("Failed to decompress `val_base`"))?,
        B_blinding: CompressedRistretto(rand_base).decompress()
            .ok_or_else(|| BatchRangeProofError::new("Failed to decompress `rand_base`"))?,
    };

    // Convert `r` to Scalars
    let r: Vec<Scalar> = r.iter().map(|b| Scalar::from_bytes_mod_order(*b)).collect();

    // Generate proof and commitments
    let (proof, comms) = bulletproofs::RangeProof::prove_multiple(
        &BULLETPROOF_GENERATORS,
        &pg,
        &mut Transcript::new(BULLETPROOF_DST),
        &v,
        &r,
        num_bits,
    )
        .map_err(|e| BatchRangeProofError::new(&format!("Failed to generate range proof: {}", e)))?;

    // Serialize commitments
    let serialized_comms: Vec<Vec<u8>> = comms.iter().map(|comm| comm.as_bytes().to_vec()).collect();

    // Return the proof and serialized commitments
    Ok(NativeBatchRangeProof {
        proof: proof.to_bytes(),
        comms: serialized_comms,
    })
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_batch_range_proof() {
        // Test data
        let v = vec![100u64, 65535u64, 65535u64, 65535u64, 0u64, 0u64, 0u64, 0u64];

        let rs = vec![
            vec![
                156, 109,  62, 196, 154, 157,  21,  68,
                90, 114, 172, 209, 197, 139, 143,  61,
                160,  58,  39, 102, 219, 171,  91, 239,
                231, 110, 102,  68, 251,  78, 229,   0
            ],
            vec![
                226, 255, 163,  21, 112, 110, 162,  20,
                221, 143, 164, 105, 231,  33, 193, 148,
                18,  80, 162,  29, 129, 255, 120,  26,
                185,  11,  14, 203,  58, 117,  11,   1
            ],
            vec![
                211, 135, 180,  67,  78, 113,  51,   3,
                30, 106, 175, 250, 253,  98, 107, 107,
                107, 121,  18,  79, 184,  72, 112, 110,
                110,  43,  88, 237,  40, 115, 230,   6
            ],
            vec![
                56,  81,  75, 153,  26,  80, 124, 115,
                117,  11, 158, 226,  43,  22, 118, 212,
                25,  35, 141,  99, 176, 184, 129,  64,
                95, 152, 221,  31, 146,  30, 124,  15
            ],
            vec![
                14,   2,  23, 100, 172, 102,  32, 214,
                40, 175, 237, 119, 212, 103, 134,  94,
                56, 231,  33, 141, 255, 144,  46, 225,
                135, 191,  49,  99, 200, 179,  55,  15
            ],
            vec![
                6, 141, 188,  12,  66, 106,  33, 133,
                111, 176,  43,  67, 187, 180,  73, 117,
                141, 252,  16,  34, 219, 237, 107, 148,
                6,  46, 121, 189, 220, 189,  23,  15
            ],
            vec![
                77, 236,   7, 237, 246, 153, 229,  89,
                79,  53, 191, 120, 201, 221,  49, 168,
                233, 183, 255, 203,  68,  93, 210,  76,
                15, 214, 104,  59, 171,   1,  28,  12
            ],
            vec![
                111, 233, 138,  35, 138,  32,  76, 127,
                96, 165, 119,  52, 156,   0, 140,  60,
                12, 122,  15, 203, 194, 112,  17,  92,
                82,  51, 120, 157,  63,   0, 242,  14
            ],
        ];

        let val_base = vec![
            226, 242, 174,  10, 106, 188,  78, 113,
            168, 132, 169,  97, 197,   0,  81,  95,
            88, 227,  11, 106, 165, 130, 221, 141,
            182, 166,  89,  69, 224, 141,  45, 118
        ];

        let rand_base = vec![
            140, 146,  64, 180,  86, 169, 230, 220,
            101, 195, 119, 161,   4, 141, 116,  95,
            148, 160, 140, 219, 127,  68, 203, 205,
            123,  70, 243,  64,  72, 135,  17,  52
        ];

        let num_bits = 16;

        match crate::rp::_batch_range_proof(v.clone(), rs.clone(), val_base.clone(), rand_base.clone(), num_bits) {
            Ok(proof) => {
                println!("Proof generated successfully!");
                println!("Proof: {:?}", proof.proof());
                println!("Commitments: {:?}", proof.comms());
            }
            Err(e) => {
                println!("Error encountered: {}", e);
            }
        }

    }
}
