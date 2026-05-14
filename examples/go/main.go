package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"

	"github.com/aptos-labs/confidential-asset-bindings/bindings/go/aptosconfidential"
)

// Golden Pedersen bases from tests/fixtures/golden_batch_range_proof.json (valid Ristretto encodings).
var (
	valBase, _  = hex.DecodeString("e2f2ae0a6abc4e71a884a961c500515f58e30b6aa582dd8db6a65945e08d2d76")
	randBase, _ = hex.DecodeString("8c9240b456a9e6dc65c377a1048d745f94a08cdb7f44cbcd7b46f34048871134")
)

func main() {
	// Old placeholder proof + pad32(1) bases are not valid Ristretto points; release FFI returns
	// "confidential asset operation failed". Use a minimal prove→verify round-trip instead.
	blinding := make([]byte, 32)
	if _, err := rand.Read(blinding); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	proof, comms, err := aptosconfidential.BatchRangeProof([]uint64{42}, blinding, valBase, randBase, 32)
	if err != nil {
		fmt.Fprintln(os.Stderr, "BatchRangeProof:", err)
		os.Exit(1)
	}
	ok, err := aptosconfidential.BatchVerifyProof(proof, comms, valBase, randBase, 32)
	if err != nil {
		fmt.Fprintln(os.Stderr, "BatchVerifyProof:", err)
		os.Exit(1)
	}
	if !ok {
		fmt.Fprintln(os.Stderr, "BatchVerifyProof: unexpectedly false")
		os.Exit(1)
	}
	fmt.Println("aptosconfidential OK (BatchRangeProof → BatchVerifyProof)")
}
