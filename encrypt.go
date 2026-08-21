package main

import (
	"bytes"
	"fmt"
	"io"
	"strings"
	"syscall/js"

	"filippo.io/age"
	"filippo.io/age/armor"
)

func Encrypt(this js.Value, args []js.Value) interface{} {
	output := make(map[string]interface{})
	if len(args) != 2 {
		output["error"] = "invalid arguments. expected: recipients, input"
		return output
	}
	var recipients = args[0].String()
	var input = args[1].String()
	buff := bytes.NewBuffer(nil)
	ids, err := age.ParseRecipients(strings.NewReader(recipients))
	if err != nil {
		output["error"] = err.Error()
		return output
	}
	err = encrypt(ids, strings.NewReader(input), buff, true)
	if err != nil {
		output["error"] = err.Error()
		return output
	}
	output["output"] = buff.String()
	return output
}

func EncryptBinary(this js.Value, args []js.Value) interface{} {
	if len(args) != 2 {
		return fmt.Errorf("invalid arguments. expected: recipients, input")
	}

	var recipients = args[0].String()
	ids, err := age.ParseRecipients(strings.NewReader(recipients))
	if err != nil {
		return err.Error()
	}

	input := make([]byte, args[1].Length())
	js.CopyBytesToGo(input, args[1])

	buff := bytes.NewBuffer(nil)
	err = encrypt(ids, bytes.NewReader(input), buff, false)
	if err != nil {
		return err.Error()
	}

	result := js.Global().Get("Uint8Array").New(buff.Len())
	js.CopyBytesToJS(result, buff.Bytes())
	return result
}

// EncryptWithPassword encrypts a string using a password (scrypt) instead of recipient keys
func EncryptWithPassword(this js.Value, args []js.Value) interface{} {
	output := make(map[string]interface{})
	if len(args) != 2 {
		output["error"] = "invalid arguments. expected: password, input"
		return output
	}
	var password = args[0].String()
	var input = args[1].String()
	r, err := age.NewScryptRecipient(password)
	if err != nil {
		output["error"] = err.Error()
		return output
	}
	buff := bytes.NewBuffer(nil)
	if err := encrypt([]age.Recipient{r}, strings.NewReader(input), buff, true); err != nil {
		output["error"] = err.Error()
		return output
	}
	output["output"] = buff.String()
	return output
}

// EncryptBinaryWithPassword encrypts binary data using a password (scrypt) instead of recipient keys
func EncryptBinaryWithPassword(this js.Value, args []js.Value) interface{} {
	if len(args) != 2 {
		return fmt.Errorf("invalid arguments. expected: password, input")
	}

	var password = args[0].String()
	r, err := age.NewScryptRecipient(password)
	if err != nil {
		return err.Error()
	}

	input := make([]byte, args[1].Length())
	js.CopyBytesToGo(input, args[1])

	buff := bytes.NewBuffer(nil)
	if err := encrypt([]age.Recipient{r}, bytes.NewReader(input), buff, false); err != nil {
		return err.Error()
	}

	result := js.Global().Get("Uint8Array").New(buff.Len())
	js.CopyBytesToJS(result, buff.Bytes())
	return result
}

// encrypt internal helper
func encrypt(recipients []age.Recipient, in io.Reader, out io.Writer, withArmor bool) error {
	var a io.WriteCloser
	if withArmor {
		a = armor.NewWriter(out)
		out = a
	}
	w, err := age.Encrypt(out, recipients...)
	if err != nil {
		return err
	}
	if _, err := io.Copy(w, in); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	if a != nil {
		if err := a.Close(); err != nil {
			return err
		}
	}
	return nil
}
