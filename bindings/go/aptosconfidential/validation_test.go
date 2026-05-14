//go:build cgo

package aptosconfidential

import (
	"strings"
	"testing"
)

func TestFlattenCommsRejectsInvalidInputs(t *testing.T) {
	if _, err := FlattenComms(nil); err == nil {
		t.Fatal("expected error for empty commitments")
	}
	if _, err := FlattenComms([][]byte{{1, 2, 3}}); err == nil {
		t.Fatal("expected error for invalid commitment length")
	}
}

func TestFlattenBlindingsRejectsInvalidLength(t *testing.T) {
	if _, err := FlattenBlindings([][]byte{{1, 2, 3}}); err == nil {
		t.Fatal("expected error for invalid blinding length")
	}
}

func TestSplitCommsFlatRejectsInvalidLength(t *testing.T) {
	if _, err := SplitCommsFlat([]byte{1, 2, 3}); err == nil {
		t.Fatal("expected error for invalid comms_flat length")
	}
}

func TestBatchFunctionsRejectInvalidNumBits(t *testing.T) {
	g := loadGolden(t)
	blindings := mustDecodeHex(t, g.BlindingsFlatHex)
	valBase := mustDecodeHex(t, g.ValBaseHex)
	randBase := mustDecodeHex(t, g.RandBaseHex)
	proof := mustDecodeHex(t, g.ProofHex)
	commsFlat := mustDecodeHex(t, g.CommsFlatHex)

	if _, _, err := BatchRangeProof(g.Values, blindings, valBase, randBase, 24); err == nil {
		t.Fatal("expected num_bits validation error for BatchRangeProof")
	}
	if _, err := BatchVerifyProof(proof, commsFlat, valBase, randBase, 24); err == nil {
		t.Fatal("expected num_bits validation error for BatchVerifyProof")
	}
}

func TestSolverCloseAndSolveLifecycle(t *testing.T) {
	s := NewSolver()
	if s == nil {
		t.Fatal("expected non-nil solver")
	}
	if err := s.Close(); err != nil {
		t.Fatalf("close failed: %v", err)
	}
	if err := s.Close(); err != nil {
		t.Fatalf("close should be idempotent: %v", err)
	}

	y := make([]byte, 32)
	if _, err := s.Solve(y, 16); err == nil || !strings.Contains(err.Error(), "nil or closed") {
		t.Fatalf("expected closed solver error, got: %v", err)
	}
}

func TestSolverSolveValidatesInputs(t *testing.T) {
	var nilSolver *Solver
	y := make([]byte, 32)
	if _, err := nilSolver.Solve(y, 16); err == nil || !strings.Contains(err.Error(), "nil or closed") {
		t.Fatalf("expected nil solver error, got: %v", err)
	}

	s := NewSolver()
	if s == nil {
		t.Fatal("expected non-nil solver")
	}
	t.Cleanup(func() {
		_ = s.Close()
	})

	if _, err := s.Solve([]byte{1, 2, 3}, 16); err == nil {
		t.Fatal("expected y length validation error")
	}
	if _, err := s.Solve(y, 8); err == nil {
		t.Fatal("expected max_num_bits validation error")
	}
}
