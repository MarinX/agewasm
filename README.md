# Age WASM [app](https://age-wasm.ey.r.appspot.com/)

A simple and secure online client-side Age key generator, encryption and decryption tool built using wasm

View online [here](https://age-wasm.ey.r.appspot.com/)

## Building

You will need `Go` and `wasm_exec.js` (which is included with Go)

### Supporting wasm_exec.js

The JavaScript file can be found in the GOROOT folder. To copy it to the static directory use the following command:

```sh
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" ./static
```

or use provided `Makefile` and execute `make import`

### Compile it to a .wasm file

```sh
GOOS=js GOARCH=wasm go build -o static/age.wasm
```

or use provided `Makefile` and execute `make build`

Now you should have `age.wasm` and `wasm_exec.js` in static folder.

## Using

Put the static folder on your favorite web server server or open `index.html`.
There is no binary to run :)

---

**Prebuilt files?**

You can grab generated zip file which includes `age.wasm` and `wasm_exec.js` on [release page](https://github.com/MarinX/agewasm/releases).

---

## License

This project is licensed under the MIT License. See the LICENSE file for the full license text.
