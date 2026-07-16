# Changelog

## 0.2.0 - 2026-07-16

- Added native Windows 11 x64 packaging through NSIS and ZIP targets.
- Added Windows system-audio loopback for meeting transcription.
- Added Windows-aware onboarding, privacy settings links, and keyboard shortcuts.
- Added multi-monitor screen capture based on the display under the pointer.
- Added Windows content protection through Electron's supported API.
- Added OS-protected API-key storage using Windows DPAPI through Electron safeStorage.
- Enabled renderer sandboxing and restricted navigation, external URLs, IPC senders, and media permissions.
- Added automated tests and a Windows GitHub Actions build.
