import CoreAudio
import Foundation
import RemoteCore

/// Core Audio's Swift HAL wrapper is available from the package's macOS 15 deployment target.
struct CoreAudioHardware: AudioHardwarePort {
    func snapshot() throws -> AudioOutputSnapshot? {
        guard let device = try AudioHardwareSystem.shared.defaultOutputDevice else { return nil }
        let id = try identity(device)
        let output = try AudioOutputSnapshot(
            id: id,
            name: device.name,
            volume: readVolume(device),
            mute: readMute(device)
        )
        _ = try currentDevice(expected: id)
        return output
    }

    func writeVolume(_ level: VolumeLevel, expected: AudioOutputID) throws {
        let device = try currentDevice(expected: expected)
        let address = property(kAudioDevicePropertyVolumeScalar)
        guard device.hasProperty(address: address),
            try device.isPropertySettable(address: address)
        else { throw AudioFailure.volumeUnavailable }
        try device.setPropertyData(address: address, data: bytes(Float32(level.scalar)))
    }

    func writeMute(_ muted: Bool, expected: AudioOutputID) throws {
        let device = try currentDevice(expected: expected)
        let address = property(kAudioDevicePropertyMute)
        guard device.hasProperty(address: address),
            try device.isPropertySettable(address: address)
        else { throw AudioFailure.muteUnavailable }
        try device.setPropertyData(address: address, data: bytes(UInt32(muted ? 1 : 0)))
    }

    func observe(
        output: AudioOutputID?,
        onChange: @escaping @Sendable (AudioHardwareChange) -> Void
    ) throws -> any AudioObservation {
        let system = AudioHardwareSystem.shared
        var registrations = [AudioPropertyRegistration]()
        registrations.append(
            try AudioPropertyRegistration(
                object: system.id,
                address: property(
                    kAudioHardwarePropertyDefaultOutputDevice,
                    scope: kAudioObjectPropertyScopeGlobal),
                onChange: { onChange(.stateChanged) }
            )
        )
        let restarted = property(
            kAudioHardwarePropertyServiceRestarted, scope: kAudioObjectPropertyScopeGlobal)
        if system.hasProperty(address: restarted) {
            registrations.append(
                try AudioPropertyRegistration(
                    object: system.id, address: restarted,
                    onChange: { onChange(.serviceRestarted) }
                )
            )
        }
        if let output {
            let device = try currentDevice(expected: output)
            let addresses = [
                property(kAudioDevicePropertyVolumeScalar),
                property(kAudioDevicePropertyMute),
                property(kAudioDevicePropertyDeviceIsAlive, scope: kAudioObjectPropertyScopeGlobal),
                property(kAudioObjectPropertyName, scope: kAudioObjectPropertyScopeGlobal),
                property(kAudioObjectPropertyOwnedObjects, scope: kAudioObjectPropertyScopeGlobal),
            ]
            for address in addresses where device.hasProperty(address: address) {
                registrations.append(
                    try AudioPropertyRegistration(
                        object: device.id, address: address,
                        onChange: { onChange(.stateChanged) }
                    )
                )
            }
        }
        return CoreAudioObservation(registrations: registrations)
    }

    private func identity(_ device: AudioHardwareDevice) throws -> AudioOutputID {
        try AudioOutputID(objectID: device.id, uid: device.uid)
    }

    private func currentDevice(expected: AudioOutputID) throws -> AudioHardwareDevice {
        guard let device = try AudioHardwareSystem.shared.defaultOutputDevice else {
            throw AudioFailure.noOutput
        }
        guard try identity(device) == expected else { throw AudioFailure.outputChanged }
        return device
    }

    private func readVolume(_ device: AudioHardwareDevice) throws -> AudioControl<VolumeLevel> {
        let address = property(kAudioDevicePropertyVolumeScalar)
        guard device.hasProperty(address: address) else { return .unsupported }
        let data = try device.propertyData(address: address)
        guard data.count == MemoryLayout<Float32>.size else { throw AudioFailure.hardwareFailure }
        let scalar = data.withUnsafeBytes { $0.loadUnaligned(as: Float32.self) }
        guard let level = try? VolumeLevel(Double(scalar)) else {
            throw AudioFailure.hardwareFailure
        }
        return try device.isPropertySettable(address: address) ? .writable(level) : .readOnly(level)
    }

    private func readMute(_ device: AudioHardwareDevice) throws -> AudioControl<Bool> {
        let address = property(kAudioDevicePropertyMute)
        guard device.hasProperty(address: address) else { return .unsupported }
        let data = try device.propertyData(address: address)
        guard data.count == MemoryLayout<UInt32>.size else { throw AudioFailure.hardwareFailure }
        let muted = data.withUnsafeBytes { $0.loadUnaligned(as: UInt32.self) } != 0
        return try device.isPropertySettable(address: address) ? .writable(muted) : .readOnly(muted)
    }

    private func bytes<Value: BitwiseCopyable>(_ value: Value) -> Data {
        withUnsafeBytes(of: value) { Data($0) }
    }

    private func property(
        _ selector: AudioObjectPropertySelector,
        scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeOutput
    ) -> AudioObjectPropertyAddress {
        AudioObjectPropertyAddress(
            mSelector: selector, mScope: scope, mElement: kAudioObjectPropertyElementMain
        )
    }
}

private final class CoreAudioObservation: AudioObservation {
    private let registrations: [AudioPropertyRegistration]

    init(registrations: [AudioPropertyRegistration]) {
        self.registrations = registrations
    }

    func cancel() {
        for registration in registrations { registration.cancel() }
    }
}

/// Confined to the service actor. The C callback only forwards a Sendable event closure.
private final class AudioPropertyRegistration {
    private let object: AudioObjectID
    private let address: AudioObjectPropertyAddress
    private let block: AudioObjectPropertyListenerBlock
    private let queue = DispatchQueue(label: "com.antonomelchuk.remotecontrol.audio-events")
    private var active = false

    init(
        object: AudioObjectID,
        address: AudioObjectPropertyAddress,
        onChange: @escaping @Sendable () -> Void
    ) throws {
        self.object = object
        self.address = address
        self.block = { _, _ in onChange() }
        var address = address
        let status = AudioObjectAddPropertyListenerBlock(object, &address, queue, block)
        guard status == noErr else { throw AudioFailure.observationUnavailable }
        active = true
    }

    func cancel() {
        guard active else { return }
        active = false
        var address = address
        _ = AudioObjectRemovePropertyListenerBlock(object, &address, queue, block)
    }

    deinit {
        guard active else { return }
        var address = address
        _ = AudioObjectRemovePropertyListenerBlock(object, &address, queue, block)
    }
}
