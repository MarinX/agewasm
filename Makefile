.PHOHY: import build-wasm build clean zip deploy-gcp

GOROOT:=$(shell go env GOROOT)

import:
	mkdir -p vendor
	cp "$(GOROOT)/misc/wasm/wasm_exec.js" vendor/

build-wasm:
	mkdir -p vendor
	GOOS=js GOARCH=wasm go build -mod=mod -o vendor/age.wasm

build: import build-wasm
	pnpm run build

clean:
	rm -rf vendor/ dist/

zip: build
	cd dist && zip -r ../agewasm.zip .

deploy-gcp: build
	gcloud app deploy
