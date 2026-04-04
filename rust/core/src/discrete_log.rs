//! Discrete log solver functionality.
//!
//! Provides pure Rust functions for solving discrete log problems.
//! Supports 16-bit and 32-bit discrete logs with various algorithm options.

use curve25519_dalek::ristretto::{CompressedRistretto, RistrettoPoint};

// ============================================================================
// Helper: parse compressed point
// ============================================================================

pub(crate) fn parse_point(y: &[u8]) -> Result<RistrettoPoint, String> {
    if y.len() != 32 {
        return Err(format!(
            "invalid point length: expected 32 bytes, got {}",
            y.len()
        ));
    }

    let y_compressed =
        CompressedRistretto::from_slice(y).map_err(|_| "invalid compressed point".to_string())?;

    y_compressed
        .decompress()
        .ok_or_else(|| "failed to decompress point".to_string())
}

// ============================================================================
// TBSGS-k feature: TBSGS-k32 (32-bit) + NaiveTruncatedDoubledLookup (16-bit)
// This is the recommended option: ~512 KiB table, smallest WASM with good performance.
// ============================================================================

#[cfg(feature = "tbsgs_k")]
mod solver_impl {
    use super::*;
    use ristretto255_dlog::naive_truncated_doubled_lookup::NaiveTruncatedDoubledLookup;
    use ristretto255_dlog::tbsgs_k::TruncatedBabyStepGiantStepK;

    pub struct Solver {
        solver_16: NaiveTruncatedDoubledLookup,
        solver_32: TruncatedBabyStepGiantStepK<32>,
    }

    impl Solver {
        pub fn new() -> Self {
            use ristretto255_dlog::tbsgs_k::precomputed_tables::PrecomputedTables;

            let solver_32 = TruncatedBabyStepGiantStepK::<32>::from_precomputed_table(
                PrecomputedTables::TbsgsK32,
            );

            let solver_16 = NaiveTruncatedDoubledLookup::from_tbsgs_k(&solver_32);

            Solver {
                solver_16,
                solver_32,
            }
        }

        pub fn solve_16bit(&self, y: &RistrettoPoint) -> Result<u64, String> {
            ristretto255_dlog::DiscreteLogSolver::solve(&self.solver_16, y)
                .map_err(|e| format!("failed to solve 16-bit discrete log: {}", e))
        }

        pub fn solve_32bit(&self, y: &RistrettoPoint) -> Result<u64, String> {
            ristretto255_dlog::DiscreteLogSolver::solve(&self.solver_32, y)
                .map_err(|e| format!("failed to solve 32-bit discrete log: {}", e))
        }

        pub fn algorithm() -> &'static str {
            "NaiveTruncatedDoubledLookup (16-bit) + TBSGS-k32 (32-bit)"
        }
    }
}

// ============================================================================
// BSGS-k feature: BSGS-k32 (32-bit) + NaiveDoubledLookup (16-bit)
// ============================================================================

#[cfg(all(feature = "bsgs_k", not(feature = "tbsgs_k")))]
mod solver_impl {
    use super::*;
    use ristretto255_dlog::bsgs_k::BabyStepGiantStepK;
    use ristretto255_dlog::naive_doubled_lookup::NaiveDoubledLookup;

    pub struct Solver {
        solver_16: NaiveDoubledLookup,
        solver_32: BabyStepGiantStepK<32>,
    }

    impl Solver {
        pub fn new() -> Self {
            use ristretto255_dlog::bsgs_k::precomputed_tables::PrecomputedTables;

            let solver_32 =
                BabyStepGiantStepK::<32>::from_precomputed_table(PrecomputedTables::BsgsK32);

            let solver_16 = NaiveDoubledLookup::from_bsgs_k(&solver_32);

            Solver {
                solver_16,
                solver_32,
            }
        }

        pub fn solve_16bit(&self, y: &RistrettoPoint) -> Result<u64, String> {
            ristretto255_dlog::DiscreteLogSolver::solve(&self.solver_16, y)
                .map_err(|e| format!("failed to solve 16-bit discrete log: {}", e))
        }

        pub fn solve_32bit(&self, y: &RistrettoPoint) -> Result<u64, String> {
            ristretto255_dlog::DiscreteLogSolver::solve(&self.solver_32, y)
                .map_err(|e| format!("failed to solve 32-bit discrete log: {}", e))
        }

        pub fn algorithm() -> &'static str {
            "NaiveDoubledLookup (16-bit) + BSGS-k32 (32-bit)"
        }
    }
}

// ============================================================================
// BSGS feature: BSGS (32-bit) + NaiveLookup (16-bit)
// ============================================================================

#[cfg(all(feature = "bsgs", not(any(feature = "tbsgs_k", feature = "bsgs_k"))))]
mod solver_impl {
    use super::*;
    use ristretto255_dlog::bsgs::BabyStepGiantStep;
    use ristretto255_dlog::naive_lookup::NaiveLookup;

    pub struct Solver {
        solver_16: NaiveLookup,
        solver_32: BabyStepGiantStep,
    }

    impl Solver {
        pub fn new() -> Self {
            use ristretto255_dlog::bsgs::precomputed_tables::PrecomputedTables;

            let solver_32 = BabyStepGiantStep::from_precomputed_table(PrecomputedTables::Bsgs32);

            let solver_16 = NaiveLookup::from_bsgs(&solver_32);

            Solver {
                solver_16,
                solver_32,
            }
        }

        pub fn solve_16bit(&self, y: &RistrettoPoint) -> Result<u64, String> {
            ristretto255_dlog::DiscreteLogSolver::solve(&self.solver_16, y)
                .map_err(|e| format!("failed to solve 16-bit discrete log: {}", e))
        }

        pub fn solve_32bit(&self, y: &RistrettoPoint) -> Result<u64, String> {
            ristretto255_dlog::DiscreteLogSolver::solve(&self.solver_32, y)
                .map_err(|e| format!("failed to solve 32-bit discrete log: {}", e))
        }

        pub fn algorithm() -> &'static str {
            "NaiveLookup (16-bit) + BSGS (32-bit)"
        }
    }
}

// ============================================================================
// BL12 feature: BL12 for both 16-bit and 32-bit (smallest table)
// ============================================================================

#[cfg(all(
    feature = "bl12",
    not(any(feature = "tbsgs_k", feature = "bsgs_k", feature = "bsgs"))
))]
mod solver_impl {
    use super::*;
    use ristretto255_dlog::bl12::Bl12;

    pub struct Solver {
        solver: Bl12,
    }

    impl Solver {
        pub fn new() -> Self {
            use ristretto255_dlog::bl12::precomputed_tables::PrecomputedTables;

            Solver {
                solver: Bl12::from_precomputed_table(PrecomputedTables::BernsteinLange32),
            }
        }

        pub fn solve_16bit(&self, y: &RistrettoPoint) -> Result<u64, String> {
            ristretto255_dlog::DiscreteLogSolver::solve(&self.solver, y)
                .map_err(|e| format!("failed to solve 16-bit discrete log: {}", e))
        }

        pub fn solve_32bit(&self, y: &RistrettoPoint) -> Result<u64, String> {
            ristretto255_dlog::DiscreteLogSolver::solve(&self.solver, y)
                .map_err(|e| format!("failed to solve 32-bit discrete log: {}", e))
        }

        pub fn algorithm() -> &'static str {
            "BL12 (16-bit and 32-bit)"
        }
    }
}

// ============================================================================
// Pure Rust DiscreteLogSolver
// ============================================================================

/// Discrete log solver supporting 16-bit and 32-bit secrets.
pub struct DiscreteLogSolver {
    solver: solver_impl::Solver,
}

impl DiscreteLogSolver {
    /// Creates a new solver with precomputed tables.
    pub fn new() -> DiscreteLogSolver {
        DiscreteLogSolver {
            solver: solver_impl::Solver::new(),
        }
    }

    /// Solves the discrete log problem.
    ///
    /// Given a compressed Ristretto point y = g^x (32 bytes), finds x.
    ///
    /// # Arguments
    /// * `y` - The compressed Ristretto point (32 bytes)
    /// * `max_num_bits` - Maximum bits of the secret: 16 or 32
    ///
    /// # Returns
    /// The discrete log x, or an error if not found or invalid input.
    pub fn solve(&self, y: Vec<u8>, max_num_bits: u8) -> Result<u64, String> {
        let y_point = parse_point(&y)?;

        match max_num_bits {
            16 => self.solver.solve_16bit(&y_point),
            32 => self.solver.solve_32bit(&y_point),
            _ => Err(format!(
                "unsupported max_num_bits: {}. Must be 16 or 32.",
                max_num_bits
            )),
        }
    }

    /// Returns the supported bit sizes as an array [16, 32].
    pub fn max_num_bits(&self) -> Vec<u8> {
        vec![16, 32]
    }

    /// Returns the algorithm name.
    pub fn algorithm(&self) -> String {
        solver_impl::Solver::algorithm().to_string()
    }
}
