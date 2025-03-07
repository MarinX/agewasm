.PHOHY: import build-wasm npm-install build clean zip deploy-gcp help

go-sources = go.mod go.sum *.go
web-sources = package.json pnpm-lock.yaml vite.config.js src/*

GOROOT:=$(shell go env GOROOT)

# The below code utilizes make's file change tracking
# (i.e. not rebuilding targets unnecessarily)
# while still allowing human-readable target names.
# 
# First we set a variable named foo that holds
# all the actual output filenames.
# Then we use $(foo) anywhere we need
# to reference that target as a prerequisite.
# Finally we create a target foo which
# has $(foo) as a prerequisite.

# make import: copy the required wasm_exec.js file from the Go toolchain (output in vendor/)
import = vendor/wasm_exec.js

$(import): $(GOROOT)/misc/wasm/wasm_exec.js
	mkdir -p vendor
	cp "$(GOROOT)/misc/wasm/wasm_exec.js" vendor/

import: $(import)

# make build-wasm: build the WebAssembly module (output in vendor/)
build-wasm = vendor/age.wasm

$(build-wasm): $(go-sources)
	mkdir -p vendor
	GOOS=js GOARCH=wasm go build -mod=mod -o vendor/age.wasm

build-wasm: $(build-wasm)

# make npm-install: installs tools and dependencies from npm (output in node_modules/)
#
# This uses an empty target file to track when it needs to be re-ran
npm-install = node_modules/.make-sentinel

$(npm-install): package.json pnpm-lock.yaml
	pnpm install
	touch $(npm-install)

npm-install: $(npm-install)

# make build: build the complete static website (output in dist/)
# 
# If dist/ doesn't exist $(build) will evaluate to 'dist/*'
# but that's fine here because it means the target will run.
build = dist/*

$(build): $(import) $(build-wasm) $(npm-install) $(web-sources)
	pnpm run build

build: $(build)

# make clean: delete all existing build files (deletes vendor/* dist/*)
clean:
	rm -rf vendor/ dist/

# make zip: create a zip archive with the output static website (outputs agewasm.zip)
zip = agewasm.zip
$(zip): $(build)
	cd dist && zip -r ../$(zip) .
zip: $(zip)

# make deploy-gcp: deploys to google cloud
deploy-gcp: build
	gcloud app deploy

# make help: print this help page
help:
	@echo "agewasm Makefile"
	@echo "Usage: make <TARGET>"
	@echo ""
	@echo "Available targets:"
	@grep -P '^# make [[:alnum:]_-]+:' Makefile | sed -e 's/^# /    /'
