// swift-tools-version: 6.0
import PackageDescription

var package = Package(
    name: "RemoteLink",
    platforms: [.macOS(.v15), .iOS(.v16)],
    products: [.library(name: "RemotePairing", targets: ["RemotePairing"])],
    targets: [
        .target(name: "RemotePairing"),
        .testTarget(name: "RemotePairingTests", dependencies: ["RemotePairing"]),
    ],
    swiftLanguageModes: [.v6]
)

#if os(macOS)
    package.targets.append(
        .target(
            name: "RemoteLinkAppleClient", dependencies: ["RemotePairing"],
            path: "apple", exclude: ["RemoteLinkModule.swift"]))
    package.targets.first(where: { $0.name == "RemotePairingTests" })?.dependencies.append(
        .target(name: "RemoteLinkAppleClient"))
#endif
