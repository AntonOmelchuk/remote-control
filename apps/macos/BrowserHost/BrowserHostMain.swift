import Darwin
import Foundation
import RemotePairing

/// stdout is reserved exclusively for Chrome's length-prefixed protocol.
@main
enum BrowserHostMain {
    static func main() async {
        signal(SIGPIPE, SIG_IGN)
        guard CommandLine.arguments.count >= 2,
            CommandLine.arguments[1] == BrowserBridgeIdentity.origin
        else { exit(2) }
        do {
            try await BrowserHostRelay().run()
            exit(0)
        } catch {
            try? FileHandle.standardError.write(
                contentsOf: Data(
                    "Remote Control browser bridge closed. Check the Agent and host installation.\n"
                        .utf8))
            exit(1)
        }
    }
}
