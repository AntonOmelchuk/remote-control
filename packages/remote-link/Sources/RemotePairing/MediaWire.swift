import Foundation

public enum MediaFailure: String, Codable, Error, Sendable {
    case bridgeUnavailable, targetChanged, notReady, blocked, timedOut
}

public struct YouTubeSnapshot: Codable, Equatable, Sendable {
    public enum Availability: String, Codable, Sendable {
        case ready, advertisement, unavailable, disconnected, stale
    }
    public let availability: Availability
    public let targetID: UUID?
    public let videoID: String?
    public let title: String?
    public let paused: Bool?
    public let position: Double?
    public let duration: Double?

    public init(
        availability: Availability, targetID: UUID? = nil, videoID: String? = nil,
        title: String? = nil, paused: Bool? = nil, position: Double? = nil, duration: Double? = nil
    ) {
        self.availability = availability
        self.targetID = targetID
        self.videoID = videoID
        self.title = title
        self.paused = paused
        self.position = position
        self.duration = duration
    }

    public func validate() throws {
        switch availability {
        case .ready, .advertisement:
            guard targetID != nil, let videoID, Self.validVideoID(videoID), let title,
                !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                title.utf8.count <= 200,
                !title.unicodeScalars.contains(where: {
                    CharacterSet.controlCharacters.contains($0)
                }),
                paused != nil, let position, position.isFinite, (0...604_800).contains(position),
                duration.map({ $0.isFinite && (0...604_800).contains($0) }) ?? true
            else { throw PairingFailure.protocolError }
        default:
            guard targetID == nil, videoID == nil, title == nil, paused == nil,
                position == nil, duration == nil
            else { throw PairingFailure.protocolError }
        }
    }

    public static func validVideoID(_ value: String) -> Bool {
        value.utf8.count == 11
            && value.utf8.allSatisfy {
                (65...90).contains($0) || (97...122).contains($0) || (48...57).contains($0)
                    || $0 == 45 || $0 == 95
            }
    }
}

/// Shared by the authenticated phone and browser channels; never uses wall-clock deadlines.
struct RequestBudget: Sendable {
    private var tokens = 10.0
    private var last: ContinuousClock.Instant
    init(now: ContinuousClock.Instant) { last = now }
    mutating func consume(now: ContinuousClock.Instant) throws {
        guard now >= last else { throw PairingFailure.protocolError }
        let elapsed = last.duration(to: now).components
        let seconds = Double(elapsed.seconds) + Double(elapsed.attoseconds) / 1e18
        let available = min(10, tokens + seconds * 10)
        guard available >= 1 else { throw PairingFailure.busy }
        tokens = available - 1
        last = now
    }
}
