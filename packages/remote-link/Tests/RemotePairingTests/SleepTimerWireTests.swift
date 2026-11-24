import Foundation
import RemotePairing
import Testing

@Suite("Sleep timer transport boundaries")
struct SleepTimerWireTests {
    private func fixture() throws -> [String: Any] {
        let url = try #require(
            Bundle.module.url(
                forResource: "sleep-timer-v1", withExtension: "json", subdirectory: "Fixtures"))
        return try #require(
            JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
    }
    private func decode(_ value: Any) throws -> RemoteAudioFrame {
        try RemoteAudioFrame.decode(JSONSerialization.data(withJSONObject: value))
    }

    @Test func sharedFixtureDecodesInSwiftAndJavaScript() throws {
        let data = try fixture()
        let start = try decode(#require(data["start"]))
        let cancel = try decode(#require(data["cancel"]))
        try start.validateCommand()
        try cancel.validateCommand()
        let status = try #require(data["status"] as? [String: Any])
        let snapshot = try JSONDecoder().decode(
            RemoteAudioSnapshot.self,
            from: JSONSerialization.data(withJSONObject: #require(status["snapshot"])))
        try snapshot.validate()
        #expect(start.durationMinutes == 165)
        #expect(snapshot.timer?.durationSeconds == 9900)
        #expect(snapshot.timer?.id == cancel.timerID)
        #expect(snapshot.selectionID == start.selectionID)
        let page = try BrowserBridgeFrame.decode(
            JSONSerialization.data(withJSONObject: #require(data["state"])))
        try page.validateUpstream()
        #expect(page.selectionID == snapshot.selectionID)
    }

    @Test func commandArgumentsCannotCrossActionBoundaries() throws {
        let values = try fixture()
        let original = try decode(#require(values["start"]))
        for minutes in [1, 165, 720] {
            var frame = original
            frame.durationMinutes = minutes
            try frame.validateCommand()
        }
        for minutes in [Int.min, 0, 721, Int.max] {
            var frame = original
            frame.durationMinutes = minutes
            #expect(throws: PairingFailure.protocolError) { try frame.validateCommand() }
        }
        var frame = original
        frame.volume = 0.2
        #expect(throws: PairingFailure.protocolError) { try frame.validateCommand() }
        frame = original
        frame.selectionID = nil
        #expect(throws: PairingFailure.protocolError) { try frame.validateCommand() }
        frame = original
        frame.type = .refreshAudio
        #expect(throws: PairingFailure.protocolError) { try frame.validateCommand() }
        frame = try decode(#require(values["cancel"]))
        frame.durationMinutes = 10
        #expect(throws: PairingFailure.protocolError) { try frame.validateCommand() }
        frame = try decode(#require(values["cancel"]))
        frame.timerID = nil
        #expect(throws: PairingFailure.protocolError) { try frame.validateCommand() }
    }

    @Test func timerCommandsUseExistingSessionAndSequenceGate() throws {
        let frame = try decode(#require(try fixture()["start"]))
        let now = ContinuousClock.now
        var gate = RemoteAudioGate(sessionID: frame.sessionID, now: now)
        try gate.accept(frame, now: now)
        #expect(throws: PairingFailure.protocolError) { try gate.accept(frame, now: now) }
        var foreign = RemoteAudioGate(sessionID: UUID(), now: now)
        #expect(throws: PairingFailure.protocolError) { try foreign.accept(frame, now: now) }
    }

    @Test func malformedTimerStatesCannotBecomeAuthoritative() throws {
        let id = UUID()
        let selection = UUID()
        let valid = RemoteSleepTimer(
            phase: .running, id: id, selectionID: selection, durationSeconds: 9900,
            remainingSeconds: 9899)
        try valid.validate()
        try RemoteSleepTimer().validate()
        for invalid in [
            RemoteSleepTimer(
                phase: .running, id: id, selectionID: selection, durationSeconds: 59,
                remainingSeconds: 1),
            RemoteSleepTimer(
                phase: .running, id: id, selectionID: selection, durationSeconds: 60,
                remainingSeconds: 0),
            RemoteSleepTimer(
                phase: .running, id: id, selectionID: selection, durationSeconds: 60,
                remainingSeconds: 61),
            RemoteSleepTimer(
                phase: .completed, id: id, selectionID: selection, durationSeconds: 60,
                remainingSeconds: 1),
            RemoteSleepTimer(phase: .failed, id: id, selectionID: selection, durationSeconds: 60),
            RemoteSleepTimer(
                phase: .cancelled, id: id, selectionID: selection, durationSeconds: 60),
            RemoteSleepTimer(phase: .idle, id: id),
        ] { #expect(throws: PairingFailure.protocolError) { try invalid.validate() } }
        #expect(throws: PairingFailure.protocolError) {
            try RemoteAudioSnapshot(
                revision: 1, output: nil, failure: nil, selectionID: UUID(), timer: valid
            ).validate()
        }
    }

    @Test func browserSelectionIdentityIsStateOnlyAndCanonicalUUID() throws {
        let values = try fixture()
        var object = try #require(values["state"] as? [String: Any])
        object["selectionID"] = "bad"
        #expect(throws: PairingFailure.protocolError) {
            try BrowserBridgeFrame.decode(JSONSerialization.data(withJSONObject: object))
        }
        var heartbeat = BrowserBridgeFrame(.browserHeartbeat)
        heartbeat.selectionID = UUID()
        #expect(throws: PairingFailure.protocolError) { try heartbeat.validateUpstream() }
        var command = BrowserBridgeFrame(.browserCommand)
        command.requestID = UUID()
        command.targetID = UUID()
        command.paused = true
        command.selectionID = UUID()
        #expect(throws: PairingFailure.protocolError) { try command.validateDownstream() }
    }
}
