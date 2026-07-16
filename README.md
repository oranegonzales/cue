<div align="center">

# cue for Windows 11

**A Windows 11 AI overlay with screen context, microphone input, and system-audio loopback.**

<img src="docs/overlay.png" width="620" alt="cue overlay" />

</div>

> [!NOTE]
> This is a modified Windows 11 version of [Blueturboguy07/cue](https://github.com/Blueturboguy07/cue). The Windows port was started on July 16, 2026. It remains licensed under GPL-3.0-or-later.

> [!IMPORTANT]
> Screen-share exclusion is best effort. Electron asks Windows to exclude cue through `WDA_EXCLUDEFROMCAPTURE`, but a capture tool, operating-system update, or capture mode may ignore that request or display a blank area. Test your exact setup before sharing. Do not use hidden assistance during an exam, interview, meeting, or recording where it breaks rules, consent requirements, or applicable law.

## Windows features

| Feature | Windows 11 implementation |
|---|---|
| Floating overlay | Transparent, always-on-top Electron window |
| Screen context | Captures the display under the mouse pointer |
| Your voice | Windows microphone through `getUserMedia` |
| Meeting audio | Windows system-audio loopback through Electron |
| Capture protection | Electron `setContentProtection(true)` |
| Local key security | Windows DPAPI through Electron `safeStorage` |
| Installer | Per-user NSIS installer with no administrator requirement |
| Portable build | ZIP archive containing the unpacked x64 app |

## Install from a build artifact

The Windows workflow produces two x64 files:

- `cue-windows-11-0.2.1-x64.exe` for a normal per-user installation
- `cue-windows-11-0.2.1-x64.zip` for a portable copy

The builds are unsigned until a Windows code-signing certificate is configured. Windows SmartScreen may therefore show an unrecognized-app warning. Only run a build from a repository and commit you trust.

## Run from source

Install Node.js 20 or newer, then run:

```bash
git clone YOUR_FORK_URL cue
cd cue
git switch windows-11
npm ci
npm start
```

Create the Windows 11 installer and ZIP package with:

```bash
npm run dist:win
```

The files are written to `dist`.

## First launch on Windows 11

1. Open cue.
2. Click the cue logo to view the setup guide.
3. Allow microphone access when Windows asks.
4. If access is blocked, open **Settings > Privacy & security > Microphone** and enable both microphone access and desktop-app access.
5. Open cue Settings, choose OpenAI, Anthropic, or Gemini, and enter your own API key.
6. Start listening and play meeting audio to confirm that both microphone and system-audio transcription work.
7. Test cue with the exact screen-sharing or recording application you plan to use.

## Shortcuts on Windows

| Action | Shortcut |
|---|---|
| Assist with the current screen and conversation | `Ctrl` + `Enter` |
| Solve a coding problem on screen | `Ctrl` + `Alt` + `H` |
| Open Settings while cue has focus | `Ctrl` + `,` |
| Quit cue | `Ctrl` + `Shift` + `X` |

`Ctrl` + `Alt` + `H` is used instead of the upstream `Ctrl` + `H` mapping so cue does not replace the common History shortcut in Windows applications.

## How it works

cue keeps three inputs separate:

- Screen: Electron captures the display under the pointer only when a feature needs visual context.
- Microphone: The renderer captures your microphone and sends short PCM segments to the selected transcription provider.
- Meeting audio: On Windows, Electron supplies a loopback audio stream for the current system output.

The transcript and optional screenshot are sent directly to the AI provider selected in Settings. cue does not operate an application server or telemetry service.

## Privacy and security

- API keys are encrypted on Windows with DPAPI through Electron `safeStorage`.
- Legacy plaintext keys are migrated to protected storage after the first successful launch.
- The renderer runs with context isolation, no Node integration, and process sandboxing.
- Navigation, popup windows, external settings links, media permissions, and IPC senders are restricted.
- The packaged application uses an ASAR archive.
- Screenshots and audio are processed only when the related feature is used.

See [SECURITY.md](SECURITY.md) for the complete security notes.

## Validation

Run the syntax checks and unit tests with:

```bash
npm test
```

The GitHub Actions workflow runs the tests on a Windows runner and then builds the NSIS installer and ZIP artifact.

## Known limitations

- Capture protection cannot be guaranteed across every Windows build and capture application.
- Unsigned builds may trigger SmartScreen.
- Windows on Arm builds are supported by `npm run dist:win:arm64`, but the default workflow builds x64.
- System-audio loopback is enabled only on Windows because Electron documents it as a Windows-only capability.
- AI-provider access, pricing, model availability, and transcription permissions depend on the user's own account.

## Upstream and license

The original project was created by [Blueturboguy07](https://github.com/Blueturboguy07/cue). This modified version preserves the upstream history and credits.

Licensed under [GPL-3.0-or-later](LICENSE). If you distribute a compiled build, provide the corresponding source code and retain the license and modification notices.
