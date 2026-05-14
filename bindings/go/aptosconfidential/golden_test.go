// Golden tests load tests/fixtures/golden_batch_range_proof.json, which is produced by
// Rust (aptos_confidential_asset_core example emit_binding_golden_vector). Go FFI must
// verify that proof/comms and round-trip prove→verify against the same inputs.
package aptosconfidential

import (
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

type goldenFixture struct {
	Values           []uint64 `json:"values"`
	BlindingsFlatHex string   `json:"blindings_flat_hex"`
	ValBaseHex       string   `json:"val_base_hex"`
	RandBaseHex      string   `json:"rand_base_hex"`
	NumBits          int      `json:"num_bits"`
	ProofHex         string   `json:"proof_hex"`
	CommsFlatHex     string   `json:"comms_flat_hex"`
}

func repoRoot(t *testing.T) string {
	t.Helper()
	try := func(start string) (string, bool) {
		dir := start
		for range 15 {
			fixture := filepath.Join(dir, "tests", "fixtures", "golden_batch_range_proof.json")
			if _, err := os.Stat(fixture); err == nil {
				return dir, true
			}
			parent := filepath.Dir(dir)
			if parent == dir {
				break
			}
			dir = parent
		}
		return "", false
	}
	if wd, err := os.Getwd(); err == nil {
		if r, ok := try(wd); ok {
			return r
		}
	}
	if _, file, _, ok := runtime.Caller(1); ok {
		if r, ok := try(filepath.Dir(file)); ok {
			return r
		}
	}
	t.Fatal("could not locate repository root (tests/fixtures/golden_batch_range_proof.json)")
	return ""
}

func loadGolden(t *testing.T) goldenFixture {
	t.Helper()
	root := repoRoot(t)
	path := filepath.Join(root, "tests", "fixtures", "golden_batch_range_proof.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	var g goldenFixture
	if err := json.Unmarshal(raw, &g); err != nil {
		t.Fatalf("parse fixture: %v", err)
	}
	return g
}

func mustDecodeHex(t *testing.T, s string) []byte {
	t.Helper()
	b, err := hex.DecodeString(s)
	if err != nil {
		t.Fatalf("hex: %v", err)
	}
	return b
}

func TestGoldenFixtureVerifyMatchesGoFFI(t *testing.T) {
	g := loadGolden(t)
	proof := mustDecodeHex(t, g.ProofHex)
	commsFlat := mustDecodeHex(t, g.CommsFlatHex)
	valBase := mustDecodeHex(t, g.ValBaseHex)
	randBase := mustDecodeHex(t, g.RandBaseHex)

	ok, err := BatchVerifyProof(proof, commsFlat, valBase, randBase, g.NumBits)
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("expected verification true for golden fixture")
	}
}

func TestGoldenInputsProveThenVerifyRoundTrip(t *testing.T) {
	g := loadGolden(t)
	blindings := mustDecodeHex(t, g.BlindingsFlatHex)
	valBase := mustDecodeHex(t, g.ValBaseHex)
	randBase := mustDecodeHex(t, g.RandBaseHex)

	proof, commsFlat, err := BatchRangeProof(g.Values, blindings, valBase, randBase, g.NumBits)
	if err != nil {
		t.Fatal(err)
	}
	ok, err := BatchVerifyProof(proof, commsFlat, valBase, randBase, g.NumBits)
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("expected verify true after prove")
	}
}
