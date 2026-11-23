import Foundation
import RemotePairing
import Testing

#if canImport(Darwin)
    import Darwin
#else
    import Glibc
#endif

@Suite("Browser bridge boundaries")
struct BrowserBridgeTests {
    private func configuration() -> BrowserBridgeConfiguration {
        BrowserBridgeConfiguration(
            generation: UUID(), host: "192.168.1.20", port: 49322,
            fingerprint: String(repeating: "a", count: 64),
            token: PairingEncoding.base64URL(Data(repeating: 1, count: 32)))
    }

    @Test func sharedYouTubeFixtureDefinesAllThreeConsumers() throws {
        let url = try #require(
            Bundle.module.url(
                forResource: "youtube-v1", withExtension: "json", subdirectory: "Fixtures"))
        let object = try #require(
            JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
        let state = try BrowserBridgeFrame.decode(
            JSONSerialization.data(withJSONObject: #require(object["state"])))
        try state.validateUpstream()
        let command = try BrowserBridgeFrame.decode(
            JSONSerialization.data(withJSONObject: #require(object["command"])))
        try command.validateDownstream()
        #expect(command.targetID == state.snapshot?.targetID)
        var phone = RemoteAudioFrame(.setPlayback, requestID: UUID(), sessionID: UUID())
        phone.sequence = 1
        phone.targetID = command.targetID
        phone.paused = command.paused
        try phone.validateCommand()
        phone.volume = 0.4
        #expect(throws: PairingFailure.protocolError) { try phone.validateCommand() }
        #expect(throws: PairingFailure.protocolError) { try command.validateUpstream() }
        #expect(throws: PairingFailure.protocolError) { try state.validateDownstream() }
    }

    @Test func nativeFramingRejectsEmptyPartialAndOversizedPayloads() throws {
        for data in [Data(), Data([1, 0]), Data([0, 0, 0, 0]), Data([1, 16, 0, 0])] {
            #expect(throws: PairingFailure.protocolError) {
                try NativeMessageCodec.payloadLength(header: data)
            }
        }
        for length in [1, 4096] {
            let framed = try NativeMessageCodec.frame(Data(repeating: 1, count: length))
            #expect(try NativeMessageCodec.payloadLength(header: Data(framed.prefix(4))) == length)
        }
        #expect(throws: PairingFailure.protocolError) {
            try NativeMessageCodec.frame(Data(repeating: 1, count: 4097))
        }
    }

    @Test func browserGateRejectsReplayRateOverflowAndPhoneCommands() throws {
        let now = ContinuousClock.now
        var gate = BrowserBridgeGate(now: now)
        var frame = BrowserBridgeFrame(.browserHeartbeat)
        for sequence in UInt64(1)...10 {
            frame.sequence = sequence
            try gate.accept(frame, now: now)
        }
        #expect(throws: PairingFailure.protocolError) { try gate.accept(frame, now: now) }
        frame.sequence = 11
        #expect(throws: PairingFailure.busy) { try gate.accept(frame, now: now) }
        try gate.accept(frame, now: now.advanced(by: .milliseconds(100)))
        let bytes = Data("{\"version\":1,\"sequence\":0,\"type\":\"setVolume\"}".utf8)
        #expect(throws: PairingFailure.protocolError) { try BrowserBridgeFrame.decode(bytes) }
    }

    @Test func mediaValidationRejectsInvalidUnicodeNumbersAndStaleMetadata() {
        for value in [Double.nan, .infinity, -1, 604_801] {
            let media = YouTubeSnapshot(
                availability: .ready, targetID: UUID(), videoID: "abcdefghijk", title: "Video",
                paused: false, position: value)
            #expect(throws: PairingFailure.protocolError) { try media.validate() }
        }
        let stale = YouTubeSnapshot(availability: .stale, targetID: UUID())
        #expect(throws: PairingFailure.protocolError) { try stale.validate() }
        let title = YouTubeSnapshot(
            availability: .ready, targetID: UUID(), videoID: "abcdefghijk",
            title: String(repeating: "🙂", count: 51), paused: false, position: 0)
        #expect(throws: PairingFailure.protocolError) { try title.validate() }
    }

    @Test func privateRuntimeRoundTripsAndOnlyItsOwnerGenerationCanRemoveIt() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(
            UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = BrowserRuntimeStore(directory: directory)
        let value = configuration()
        try store.publish(value)
        #expect(try store.read().generation == value.generation)
        let mode =
            try FileManager.default.attributesOfItem(
                atPath: directory.appendingPathComponent("bridge.json").path)[.posixPermissions]
            as? NSNumber
        #expect(mode?.intValue == 0o600)
        store.remove(generation: UUID())
        #expect(try store.read().generation == value.generation)
        store.remove(generation: value.generation)
        #expect(throws: PairingFailure.storage) { try store.read() }
    }

    @Test func runtimeRejectsBroadPermissionsSymlinksAndOversizedFiles() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(
            UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = BrowserRuntimeStore(directory: directory)
        try store.publish(configuration())
        let file = directory.appendingPathComponent("bridge.json")
        try FileManager.default.setAttributes([.posixPermissions: 0o644], ofItemAtPath: file.path)
        #expect(throws: PairingFailure.storage) { try store.read() }
        try store.publish(configuration())
        try Data(repeating: 32, count: 4097).write(to: file)
        #expect(throws: PairingFailure.storage) { try store.read() }
        try FileManager.default.removeItem(at: file)
        try FileManager.default.createSymbolicLink(
            atPath: file.path, withDestinationPath: "/dev/null")
        #expect(throws: PairingFailure.storage) { try store.read() }
        try FileManager.default.removeItem(at: file)
        #expect(mkfifo(file.path, 0o600) == 0)
        #expect(throws: PairingFailure.storage) { try store.read() }
        try FileManager.default.removeItem(at: file)
        try FileManager.default.setAttributes(
            [.posixPermissions: 0o755], ofItemAtPath: directory.path)
        #expect(throws: PairingFailure.storage) { try store.publish(configuration()) }
    }
}
