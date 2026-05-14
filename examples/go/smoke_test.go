package main

import (
	"runtime"
	"testing"

	"github.com/aptos-labs/confidential-asset-bindings/bindings/go/aptosconfidential"
)

func TestFFILinkedAndSolverConstructs(t *testing.T) {
	s := aptosconfidential.NewSolver()
	if s == nil {
		t.Fatal("expected non-nil solver")
	}
	runtime.KeepAlive(s)
}
