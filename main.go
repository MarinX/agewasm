package main

import "syscall/js"

func main() {
	done := make(chan struct{})

	js.Global().Set("generateX25519Identity", js.FuncOf(GenerateX25519Identity))
	js.Global().Set("encrypt", js.FuncOf(Encrypt))
	js.Global().Set("encryptBinary", js.FuncOf(EncryptBinary))
	js.Global().Set("decrypt", js.FuncOf(Decrypt))
	js.Global().Set("decryptBinary", js.FuncOf(DecryptBinary))

	<-done
}
