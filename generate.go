package main

import (
	"syscall/js"

	"filippo.io/age"
)

// GenerateX25519Identity randomly generates a new X25519Identity.
func GenerateX25519Identity(this js.Value, args []js.Value) interface{} {
	output := make(map[string]interface{})
	identity, err := age.GenerateX25519Identity()
	if err != nil {
		output["error"] = err.Error()
		return output
	}
	output["privateKey"] = identity.String()
	output["publicKey"] = identity.Recipient().String()
	return output
}
