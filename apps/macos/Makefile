SHELL := /bin/sh

PROJECT := RemoteControlAgent.xcodeproj
SCHEME := RemoteControlAgent
DERIVED_DATA := $(CURDIR)/build/DerivedData
APP := $(DERIVED_DATA)/Build/Products/Debug/RemoteControlAgent.app

.PHONY: generate format lint build check run

generate:
	xcodegen generate --spec project.yml

format:
	xcrun swift-format format --configuration .swift-format --in-place --recursive Sources

lint:
	xcrun swift-format lint --configuration .swift-format --strict --recursive Sources

build: generate
	xcodebuild -project "$(PROJECT)" -scheme "$(SCHEME)" \
		-configuration Debug -destination 'platform=macOS' \
		-derivedDataPath "$(DERIVED_DATA)" build

check: lint build

run: build
	open "$(APP)"
