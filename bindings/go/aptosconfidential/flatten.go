//go:build cgo

package aptosconfidential

import (
	"errors"
	"fmt"
)

const commitmentBytes = 32

// FlattenBlindings concatenates blinding factors in order (each must be 32 bytes).
// This matches TS/WASM rs: Uint8Array[] passed to batch_range_proof.
func FlattenBlindings(rs [][]byte) ([]byte, error) {
	if len(rs) == 0 {
		return nil, nil
	}
	out := make([]byte, 0, len(rs)*commitmentBytes)
	for i, r := range rs {
		if len(r) != commitmentBytes {
			return nil, fmt.Errorf("aptosconfidential: rs[%d] must be %d bytes, got %d", i, commitmentBytes, len(r))
		}
		out = append(out, r...)
	}
	return out, nil
}

// FlattenComms concatenates Pedersen commitments (each 32 bytes) in value order.
func FlattenComms(comms [][]byte) ([]byte, error) {
	if len(comms) == 0 {
		return nil, errors.New("aptosconfidential: comms must be non-empty")
	}
	out := make([]byte, 0, len(comms)*commitmentBytes)
	for i, c := range comms {
		if len(c) != commitmentBytes {
			return nil, fmt.Errorf("aptosconfidential: comms[%d] must be %d bytes, got %d", i, commitmentBytes, len(c))
		}
		out = append(out, c...)
	}
	return out, nil
}

// SplitCommsFlat splits a flat commitment buffer into 32-byte chunks.
func SplitCommsFlat(commsFlat []byte) ([][]byte, error) {
	if len(commsFlat)%commitmentBytes != 0 {
		return nil, fmt.Errorf("aptosconfidential: comms_flat length %d is not a multiple of %d", len(commsFlat), commitmentBytes)
	}
	n := len(commsFlat) / commitmentBytes
	out := make([][]byte, n)
	for i := 0; i < n; i++ {
		chunk := make([]byte, commitmentBytes)
		copy(chunk, commsFlat[i*commitmentBytes:(i+1)*commitmentBytes])
		out[i] = chunk
	}
	return out, nil
}

// BatchVerifyProofSlices verifies using [][]byte commitments (TS-style) by flattening internally.
func BatchVerifyProofSlices(proof []byte, comms [][]byte, valBase, randBase []byte, numBits int) (bool, error) {
	flat, err := FlattenComms(comms)
	if err != nil {
		return false, err
	}
	return BatchVerifyProof(proof, flat, valBase, randBase, numBits)
}
