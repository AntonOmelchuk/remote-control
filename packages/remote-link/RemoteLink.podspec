Pod::Spec.new do |s|
  s.name = 'RemoteLink'
  s.version = '0.1.0'
  s.summary = 'Pinned local pairing for Remote Control.'
  s.description = 'An iOS Expo module with a shared, platform-independent pairing protocol.'
  s.license = { :type => 'UNLICENSED' }
  s.author = 'Anton Omelchuk'
  s.homepage = 'https://github.com/AntonOmelchuk/remote-control'
  s.platforms = { :ios => '16.0' }
  s.source = { :git => 'https://github.com/AntonOmelchuk/remote-control.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = 'Sources/RemotePairing/**/*.swift', 'apple/**/*.swift'
  s.swift_version = '6.0'
  s.frameworks = 'Security', 'CryptoKit'
end
