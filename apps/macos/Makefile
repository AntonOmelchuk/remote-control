SHELL := /bin/sh

PROJECT := RemoteControlAgent.xcodeproj
SCHEME := RemoteControlAgent
CORE_PACKAGE := ../../packages/remote-core
DERIVED_DATA := $(CURDIR)/build/DerivedData
APP := $(DERIVED_DATA)/Build/Products/Debug/RemoteControlAgent.app

.PHONY: generate format lint test build check run

generate:
	xcodegen generate --spec project.yml

format:
	xcrun swift-format format --configuration .swift-format --in-place --recursive Sources $(CORE_PACKAGE)/Sources $(CORE_PACKAGE)/Tests $(CORE_PACKAGE)/Package.swift

lint:
	xcrun swift-format lint --configuration .swift-format --strict --recursive Sources $(CORE_PACKAGE)/Sources $(CORE_PACKAGE)/Tests $(CORE_PACKAGE)/Package.swift

test:
	xcrun swift test --package-path "$(CORE_PACKAGE)" -Xswiftc -warnings-as-errors

build: generate
	xcodebuild -project "$(PROJECT)" -scheme "$(SCHEME)" \
		-configuration Debug -destination 'platform=macOS' \
		-derivedDataPath "$(DERIVED_DATA)" build

check: lint test build

run: build
	open "$(APP)"
