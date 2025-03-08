# Age WASM [app](https://agewasm.marin-basic.com)

A simple and secure online client-side Age key generator, encryption and decryption tool built using wasm

View online [here](https://agewasm.marin-basic.com)

## Building

You will need:

- [Go](https://go.dev/) and `wasm_exec.js` (included with Go)
- [PNPM](https://pnpm.io/)

Use the provided `Makefile` and execute `make build`.

See `make help` for descriptions of other targets.

The final static website will be placed in `dist/`

## Usage

Put the `dist` folder on your favorite web server server or open `index.html`.
There is no binary to run :)

---

**Prebuilt files?**

You can grab a generated zip file on the [release page](https://github.com/MarinX/agewasm/releases).

---

## Developement

You can run a developement Vite server with live-reload using `pnpm run dev` (this will not auto-rebuild the WASM).

Please format the source files before commiting with `pnpm run format`

## License

This project is licensed under the MIT License. See the LICENSE file for the full license text.
