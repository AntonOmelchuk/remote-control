import ExpoModulesCore

public final class RemoteLinkModule: Module {
    private let client = PairingClient()
    private let audio = RemoteAudioClient()

    public func definition() -> ModuleDefinition {
        Name("RemoteLink")
        Constant("audioAPIVersion") { 1 }
        Constant("mediaAPIVersion") { 1 }
        AsyncFunction("setPlayback") {
            [audio] (owner: String, targetID: String, paused: Bool) async throws -> String in
            try await audio.setPlayback(owner: owner, targetID: targetID, paused: paused)
        }
        AsyncFunction("connectAudio") { [audio] (owner: String) async throws -> String in
            try await audio.connect(owner: owner)
        }
        AsyncFunction("audioStatus") { [audio] (owner: String) async throws -> String in
            try await audio.status(owner: owner)
        }
        AsyncFunction("setAudioVolume") {
            [audio] (owner: String, outputID: String, volume: Double) async throws -> String in
            try await audio.setVolume(owner: owner, outputID: outputID, volume: volume)
        }
        AsyncFunction("setAudioMuted") {
            [audio] (owner: String, outputID: String, muted: Bool) async throws -> String in
            try await audio.setMuted(owner: owner, outputID: outputID, muted: muted)
        }
        AsyncFunction("disconnectAudio") { [audio] (owner: String) async in
            await audio.disconnect(owner: owner)
        }
        AsyncFunction("prepare") { [client] (code: String, name: String) in
            try await client.prepare(code: code, name: name)
        }
        AsyncFunction("pair") { [client] () async throws -> String in try await client.pair() }
        AsyncFunction("saved") { [client] () async throws -> String? in try await client.saved() }
        AsyncFunction("verifySaved") { [client] () async throws -> String in
            try await client.verifySaved()
        }
        AsyncFunction("forget") { [client, audio] () async throws in
            await audio.cancelAll()
            try await client.forget()
        }
        AsyncFunction("cancel") { [client] () async in await client.cancel() }
        OnAppEntersBackground { [audio] in Task { await audio.cancelAll() } }
        OnDestroy { [client, audio] in
            Task {
                await client.cancel()
                await audio.cancelAll()
            }
        }
    }
}
