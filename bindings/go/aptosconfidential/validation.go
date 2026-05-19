//go:build cgo

package aptosconfidential

import (
	"errors"
	"fmt"
)

var (
	errSolverNilOrClosed = errors.New("solver is nil or closed")
)

func validateRangeNumBits(numBits int) error {
	switch numBits {
	case 8, 16, 32, 64:
		return nil
	default:
		return fmt.Errorf("invalid num_bits: %d. must be one of 8, 16, 32, or 64", numBits)
	}
}

func validateSolverMaxNumBits(maxNumBits uint8) error {
	switch maxNumBits {
	case 16, 32:
		return nil
	default:
		return fmt.Errorf("invalid max_num_bits: %d. must be one of 16 or 32", maxNumBits)
	}
}
