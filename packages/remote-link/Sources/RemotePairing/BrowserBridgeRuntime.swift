#if os(macOS) || os(Linux)
    import Foundation

    #if canImport(Darwin)
        import Darwin
    #else
        import Glibc
    #endif

    /// Ephemeral browser-only capability. Phone credentials and TLS private keys never enter this file.
    public struct BrowserRuntimeStore: Sendable {
        public let directory: URL
        private var file: URL { directory.appendingPathComponent("bridge.json") }

        public init(directory: URL? = nil) {
            self.directory =
                directory
                ?? FileManager.default.homeDirectoryForCurrentUser
                .appendingPathComponent(
                    "Library/Application Support/RemoteControl/BrowserBridge", isDirectory: true)
        }

        public func publish(_ configuration: BrowserBridgeConfiguration) throws {
            do {
                try configuration.validate()
                try FileManager.default.createDirectory(
                    at: directory, withIntermediateDirectories: true,
                    attributes: [.posixPermissions: 0o700])
                try checkDirectory()
                let payload = try JSONEncoder().encode(configuration)
                guard payload.count <= PairingEncoding.maximumBytes else {
                    throw PairingFailure.storage
                }
                let temporary = directory.appendingPathComponent(UUID().uuidString + ".tmp")
                defer { try? FileManager.default.removeItem(at: temporary) }
                let descriptor = open(
                    temporary.path, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC, 0o600)
                guard descriptor >= 0 else { throw PairingFailure.storage }
                let handle = FileHandle(fileDescriptor: descriptor, closeOnDealloc: true)
                defer { try? handle.close() }
                guard fchmod(descriptor, 0o600) == 0 else { throw PairingFailure.storage }
                try handle.write(contentsOf: payload)
                guard fsync(descriptor) == 0, rename(temporary.path, file.path) == 0 else {
                    throw PairingFailure.storage
                }
            } catch { throw PairingFailure.storage }
        }

        public func read() throws -> BrowserBridgeConfiguration {
            do {
                try checkDirectory()
                let descriptor = open(file.path, O_RDONLY | O_NONBLOCK | O_NOFOLLOW | O_CLOEXEC)
                guard descriptor >= 0 else { throw PairingFailure.storage }
                let handle = FileHandle(fileDescriptor: descriptor, closeOnDealloc: true)
                defer { try? handle.close() }
                var metadata = stat()
                guard fstat(descriptor, &metadata) == 0, metadata.st_uid == geteuid(),
                    metadata.st_mode & mode_t(S_IFMT) == mode_t(S_IFREG),
                    metadata.st_mode & 0o777 == 0o600,
                    metadata.st_size > 0, metadata.st_size <= PairingEncoding.maximumBytes
                else { throw PairingFailure.storage }
                // Read at most the protocol bound even if another local process changes the file.
                let payload = try handle.read(upToCount: PairingEncoding.maximumBytes + 1) ?? Data()
                guard payload.count == Int(metadata.st_size) else { throw PairingFailure.storage }
                let configuration = try JSONDecoder().decode(
                    BrowserBridgeConfiguration.self, from: payload)
                try configuration.validate()
                return configuration
            } catch { throw PairingFailure.storage }
        }

        public func remove(generation: UUID) {
            guard let current = try? read(), current.generation == generation else { return }
            _ = unlink(file.path)
        }

        private func checkDirectory() throws {
            var metadata = stat()
            guard lstat(directory.path, &metadata) == 0, metadata.st_uid == geteuid(),
                metadata.st_mode & mode_t(S_IFMT) == mode_t(S_IFDIR),
                metadata.st_mode & 0o777 == 0o700
            else { throw PairingFailure.storage }
        }
    }
#endif
