SHELL := /bin/sh

PROJECT := RemoteControlAgent.xcodeproj
SCHEME := RemoteControlAgent
CORE_PACKAGE := ../../packages/remote-core
LINK_PACKAGE := ../../packages/remote-link
DERIVED_DATA := $(CURDIR)/build/DerivedData
DEVELOPMENT_TEAM ?=
DEVELOPMENT_APP := $(DERIVED_DATA)/Build/Products/SignedDebug/RemoteControlAgent.app
SIGNING_METADATA := $(DERIVED_DATA)/development-entitlements.plist

ifneq ($(strip $(DEVELOPMENT_TEAM)),)
SIGNING_ARGUMENTS := DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)"
endif

.PHONY: generate format lint test build check development run

generate:
	xcodegen generate --spec project.yml

format:
	xcrun swift-format format --configuration .swift-format --in-place --recursive Sources $(CORE_PACKAGE)/Sources $(CORE_PACKAGE)/Tests $(CORE_PACKAGE)/Package.swift $(LINK_PACKAGE)/Sources $(LINK_PACKAGE)/Tests $(LINK_PACKAGE)/apple $(LINK_PACKAGE)/Package.swift

lint:
	xcrun swift-format lint --configuration .swift-format --strict --recursive Sources $(CORE_PACKAGE)/Sources $(CORE_PACKAGE)/Tests $(CORE_PACKAGE)/Package.swift $(LINK_PACKAGE)/Sources $(LINK_PACKAGE)/Tests $(LINK_PACKAGE)/apple $(LINK_PACKAGE)/Package.swift

test:
	xcrun swift test --package-path "$(CORE_PACKAGE)" -Xswiftc -warnings-as-errors
	xcrun swift test --package-path "$(LINK_PACKAGE)" -Xswiftc -warnings-as-errors

build: generate
	xcodebuild -project "$(PROJECT)" -scheme "$(SCHEME)" \
		-configuration Debug -destination 'platform=macOS' \
		-derivedDataPath "$(DERIVED_DATA)" build

check: lint test build

development: generate
	@test -n "$(DEVELOPMENT_TEAM)" || test -f Signing.local.xcconfig || { \
		echo "Set DEVELOPMENT_TEAM or create Signing.local.xcconfig from the example."; exit 1; }
	xcodebuild -project "$(PROJECT)" -scheme "$(SCHEME)" \
		-configuration SignedDebug -destination 'platform=macOS' \
		-derivedDataPath "$(DERIVED_DATA)" -allowProvisioningUpdates \
		$(SIGNING_ARGUMENTS) build
	codesign --verify --strict -R '=anchor apple generic' "$(DEVELOPMENT_APP)"
	codesign -d --entitlements - --xml "$(DEVELOPMENT_APP)" > "$(SIGNING_METADATA)"
	/usr/libexec/PlistBuddy -c 'Print :com.apple.application-identifier' "$(SIGNING_METADATA)"
	/usr/libexec/PlistBuddy -c 'Print :com.apple.developer.team-identifier' "$(SIGNING_METADATA)"

run: development
	open "$(DEVELOPMENT_APP)"
