import ExpoModulesCore

public final class RemoteLinkModule: Module {
    private let client = PairingClient()

    public func definition() -> ModuleDefinition {
        Name("RemoteLink")
        AsyncFunction("prepare") { [client] (code: String, name: String) in
            try await client.prepare(code: code, name: name)
        }
        AsyncFunction("pair") { [client] () async throws -> String in try await client.pair() }
        AsyncFunction("saved") { [client] () async throws -> String? in try await client.saved() }
        AsyncFunction("verifySaved") { [client] () async throws -> String in
            try await client.verifySaved()
        }
        AsyncFunction("forget") { [client] () async throws in try await client.forget() }
        AsyncFunction("cancel") { [client] () async in await client.cancel() }
        OnDestroy { [client] in Task { await client.cancel() } }
    }
}
