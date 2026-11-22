import Foundation

/// A monotonic deadline on the Mac is authoritative; phone wall time is only an early check.
public struct PairingGate: Sendable {
    public private(set) var invitationID: UUID?
    public private(set) var pendingRequestID: UUID?
    private var deadline: ContinuousClock.Instant?
    private var failures = 0

    public init() {}

    public mutating func open(id: UUID, now: ContinuousClock.Instant) {
        invitationID = id
        pendingRequestID = nil
        deadline = now.advanced(by: .seconds(120))
        failures = 0
    }

    public func validate(id: UUID, now: ContinuousClock.Instant) throws {
        guard let invitationID, let deadline, now < deadline,
            now >= deadline.advanced(by: .seconds(-120))
        else {
            throw PairingFailure.expired
        }
        guard invitationID == id else { throw PairingFailure.invalidCode }
        guard pendingRequestID == nil else { throw PairingFailure.busy }
    }

    public mutating func recordInvalidProof() {
        failures += 1
        if failures >= 5 { cancel() }
    }

    public mutating func reserve(invitation: UUID, request: UUID, now: ContinuousClock.Instant)
        throws
    {
        try validate(id: invitation, now: now)
        pendingRequestID = request
    }

    public mutating func approve(request: UUID, now: ContinuousClock.Instant) throws {
        guard invitationID != nil, let deadline, now < deadline,
            now >= deadline.advanced(by: .seconds(-120))
        else {
            cancel()
            throw PairingFailure.expired
        }
        guard pendingRequestID == request else { throw PairingFailure.protocolError }
        cancel()
    }

    public mutating func cancel() {
        invitationID = nil
        pendingRequestID = nil
        deadline = nil
    }
}
