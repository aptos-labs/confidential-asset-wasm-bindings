//go:build cgo

package aptosconfidential

import "testing"

func TestFlattenBlindingsMatchesGoldenFixture(t *testing.T) {
	g := loadGolden(t)
	blindings := mustDecodeHex(t, g.BlindingsFlatHex)
	rs := make([][]byte, len(g.Values))
	for i := range g.Values {
		rs[i] = blindings[i*32 : (i+1)*32]
	}
	flat, err := FlattenBlindings(rs)
	if err != nil {
		t.Fatal(err)
	}
	if string(flat) != string(mustDecodeHex(t, g.BlindingsFlatHex)) {
		t.Fatal("FlattenBlindings mismatch")
	}
}

func TestBatchVerifyProofSlicesGoldenFixture(t *testing.T) {
	g := loadGolden(t)
	proof := mustDecodeHex(t, g.ProofHex)
	commsFlat := mustDecodeHex(t, g.CommsFlatHex)
	valBase := mustDecodeHex(t, g.ValBaseHex)
	randBase := mustDecodeHex(t, g.RandBaseHex)

	commsSlices, err := SplitCommsFlat(commsFlat)
	if err != nil {
		t.Fatal(err)
	}
	ok, err := BatchVerifyProofSlices(proof, commsSlices, valBase, randBase, g.NumBits)
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("BatchVerifyProofSlices must verify Rust golden proof")
	}
}
