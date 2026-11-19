// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "RemoteCore",
    platforms: [.macOS(.v15)],
    products: [.library(name: "RemoteCore", targets: ["RemoteCore"])],
    targets: [
        .target(name: "RemoteCore"),
        .testTarget(name: "RemoteCoreTests", dependencies: ["RemoteCore"]),
    ],
    swiftLanguageModes: [.v6]
)
