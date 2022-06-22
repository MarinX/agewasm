package main

import "syscall/js"

func main() {
	done := make(chan struct{})

	js.Global().Set("generateX25519Identity", js.FuncOf(GenerateX25519Identity))
	js.Global().Set("encrypt", js.FuncOf(Encrypt))
	js.Global().Set("decrypt", js.FuncOf(Decrypt))

	<-done
}
