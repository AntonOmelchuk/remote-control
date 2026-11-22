import Foundation
import RemotePairing
import Testing

@Suite("Remote audio boundaries")
struct RemoteAudioTests {
    private let session = UUID()
    private let output = UUID()

    private func command(_ type: RemoteAudioFrame.Kind = .setVolume, sequence: UInt64 = 1)
        -> RemoteAudioFrame
    {
        var frame = RemoteAudioFrame(type, requestID: UUID(), sessionID: session)
        frame.sequence = sequence
        if type == .setVolume {
            frame.outputID = output
            frame.volume = 0.42
        }
        if type == .setMuted {
            frame.outputID = output
            frame.muted = false
        }
        return frame
    }

    @Test
    func sharedFixtureDefinesTheSwiftAndJavaScriptAudioBoundary() throws {
        let url = try #require(
            Bundle.module.url(
                forResource: "remote-audio-v1", withExtension: "json", subdirectory: "Fixtures"))
        let object = try #require(
            JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
        let welcome = try RemoteAudioFrame.decode(
            JSONSerialization.data(withJSONObject: #require(object["welcome"])))
        try welcome.validateServerFrame()
        let command = try RemoteAudioFrame.decode(
            JSONSerialization.data(withJSONObject: #require(object["command"])))
        try command.validateCommand()
        let status = try #require(object["status"] as? [String: Any])
        let snapshot = try JSONDecoder().decode(
            RemoteAudioSnapshot.self,
            from: JSONSerialization.data(withJSONObject: #require(status["snapshot"])))
        #expect(snapshot == welcome.snapshot)
        #expect(command.outputID == snapshot.output?.id)
        #expect(command.sessionID == welcome.sessionID)
    }

    @Test func commandsRejectNonFiniteAndUnboundedVolume() {
        for scalar in [Double.nan, .infinity, -.infinity, -0.01, 1.01] {
            var frame = command()
            frame.volume = scalar
            #expect(throws: PairingFailure.protocolError) { try frame.validateCommand() }
        }
    }

    @Test func commandsHaveDistinctArgumentShapes() throws {
        for type in [RemoteAudioFrame.Kind.setVolume, .setMuted, .refreshAudio] {
            try command(type).validateCommand()
        }
        var frame = command(.setMuted)
        frame.volume = 0.5
        #expect(throws: PairingFailure.protocolError) { try frame.validateCommand() }
        frame = command()
        frame.outputID = nil
        #expect(throws: PairingFailure.protocolError) { try frame.validateCommand() }
        frame = command(.refreshAudio)
        frame.outputID = output
        #expect(throws: PairingFailure.protocolError) { try frame.validateCommand() }
        frame = command(.audioUpdate)
        #expect(throws: PairingFailure.protocolError) { try frame.validateCommand() }
    }

    @Test func duplicateAndOutOfOrderCommandsCannotBeDispatched() throws {
        let now = ContinuousClock.now
        var gate = RemoteAudioGate(sessionID: session, now: now)
        try gate.accept(command(), now: now)
        #expect(throws: PairingFailure.protocolError) { try gate.accept(command(), now: now) }
        #expect(throws: PairingFailure.protocolError) {
            try gate.accept(command(sequence: 3), now: now)
        }
        try gate.accept(command(sequence: 2), now: now)
    }

    @Test func anotherSessionCannotReplayACommand() {
        let now = ContinuousClock.now
        var gate = RemoteAudioGate(sessionID: UUID(), now: now)
        #expect(throws: PairingFailure.protocolError) { try gate.accept(command(), now: now) }
    }

    @Test func rateLimitIsBoundedAndRecoversWithMonotonicTime() throws {
        let now = ContinuousClock.now
        var gate = RemoteAudioGate(sessionID: session, now: now)
        for sequence in UInt64(1)...10 { try gate.accept(command(sequence: sequence), now: now) }
        #expect(throws: PairingFailure.busy) { try gate.accept(command(sequence: 11), now: now) }
        try gate.accept(command(sequence: 11), now: now.advanced(by: .milliseconds(100)))
    }

    @Test func payloadBoundariesRejectWrongVersionsUnknownActionsAndOversize() throws {
        let frame = command()
        let data = try frame.encoded()
        let decoded = try RemoteAudioFrame.decode(data)
        try decoded.validateCommand()
        let json = String(decoding: data, as: UTF8.self)
        for invalid in [
            json.replacingOccurrences(of: "setVolume", with: "shutdown"),
            json.replacingOccurrences(of: "\"version\":1", with: "\"version\":2"),
        ] {
            #expect(throws: PairingFailure.protocolError) {
                try RemoteAudioFrame.decode(Data(invalid.utf8))
            }
        }
        #expect(throws: PairingFailure.protocolError) {
            try RemoteAudioFrame.decode(
                Data(repeating: 32, count: PairingEncoding.maximumBytes + 1))
        }
    }

    @Test func snapshotsPreserveIndependentCapabilitiesAndRejectContradictions() throws {
        let snapshot = RemoteAudioSnapshot(
            revision: 1,
            output: RemoteAudioOutput(
                id: output, name: "Speakers", volume: 0.42, canSetVolume: false, muted: false,
                canSetMute: true), failure: nil)
        try snapshot.validate()
        let invalid = RemoteAudioSnapshot(
            revision: 2, output: snapshot.output, failure: .hardwareFailure)
        #expect(throws: PairingFailure.protocolError) { try invalid.validate() }
        let missingVolume = RemoteAudioSnapshot(
            revision: 3,
            output: RemoteAudioOutput(
                id: output, name: "Speakers", volume: nil, canSetVolume: true, muted: nil,
                canSetMute: false), failure: nil)
        #expect(throws: PairingFailure.protocolError) { try missingVolume.validate() }
    }

    @Test func unrecognizedFieldsCannotRideAlongWithAnAudioCommand() throws {
        let encoded = try command().encoded()
        var object = try #require(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
        object["shell"] = "ignored?"
        let data = try JSONSerialization.data(withJSONObject: object)
        #expect(throws: PairingFailure.protocolError) { try RemoteAudioFrame.decode(data) }
    }

    @Test func responseCannotBeUsedAsACommand() throws {
        var frame = RemoteAudioFrame(.audioResult, requestID: UUID(), sessionID: session)
        frame.sequence = 1
        frame.snapshot = RemoteAudioSnapshot(revision: 10, output: nil, failure: nil)
        try frame.validateServerFrame()
        #expect(throws: PairingFailure.protocolError) { try frame.validateCommand() }
        #expect(throws: PairingFailure.protocolError) { try command().validateServerFrame() }
    }
}
