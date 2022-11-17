package main

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"strings"
	"syscall/js"

	"filippo.io/age"
	"filippo.io/age/armor"
)

// Decrypt decrypts a Armored string into a string result
func Decrypt(this js.Value, args []js.Value) interface{} {
	output := make(map[string]interface{})
	if len(args) != 2 {
		output["error"] = "invalid arguments. expected: identities, input"
		return output
	}
	var identities = args[0].String()
	var input = args[1].String()
	ids, err := age.ParseIdentities(strings.NewReader(identities))
	if err != nil {
		output["error"] = err.Error()
		return output
	}
	buff := bytes.NewBuffer(nil)
	err = decrypt(ids, strings.NewReader(input), buff)
	if err != nil {
		output["error"] = err.Error()
		return output
	}
	output["output"] = buff.String()
	return output
}

// DecryptBinary decrypts binary data (Uint8Array) into a Uint8Array result
func DecryptBinary(this js.Value, args []js.Value) interface{} {
	if len(args) != 2 {
		return fmt.Errorf("invalid arguments. expected: identities, input")
	}
	var identities = args[0].String()

	ids, err := age.ParseIdentities(strings.NewReader(identities))
	if err != nil {
		return err.Error()
	}

	input := make([]byte, args[1].Length())
	js.CopyBytesToGo(input, args[1])

	buff := bytes.NewBuffer(nil)
	err = decrypt(ids, bytes.NewReader(input), buff)
	if err != nil {
		return err.Error()
	}

	result := js.Global().Get("Uint8Array").New(buff.Len())
	js.CopyBytesToJS(result, buff.Bytes())
	return result
}

// decrypt internal helper
func decrypt(keys []age.Identity, in io.Reader, out io.Writer) error {
	rr := bufio.NewReader(in)
	if start, _ := rr.Peek(len(armor.Header)); string(start) == armor.Header {
		in = armor.NewReader(rr)
	} else {
		in = rr
	}

	r, err := age.Decrypt(in, keys...)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, r); err != nil {
		return err
	}
	return nil
}
