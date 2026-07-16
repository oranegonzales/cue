<div align="center">

# Cue for Windows 11

**A Windows-first AI desktop overlay with screen context, microphone transcription, and system-audio listening.**

<img src="docs/overlay.png" width="620" alt="Cue running as a Windows 11 desktop overlay" />

</div>

> [!NOTE]
> This repository is the Windows 11 edition of Cue. It is based on the original macOS project by [Blueturboguy07](https://github.com/Blueturboguy07/cue), but the application, instructions, shortcuts, audio capture, security, installer, and build workflow in this repository are designed for Windows 11.

> [!IMPORTANT]
> Screen-capture exclusion is best effort. Windows or individual capture applications may ignore the protection request or display a blank area. Test your exact setup before sharing or recording. Use Cue only where assistance and recording are permitted.

## Windows 11 features

| Feature | Windows implementation |
|---|---|
| Desktop overlay | Transparent, movable, always-on-top Electron window |
| Screen context | Captures the Windows display under the mouse pointer |
| Your voice | Captures the selected Windows microphone |
| Meeting audio | Captures Windows system output through loopback audio |
| Zoom support | Separates microphone speech from audio played by Zoom |
| Capture protection | Requests Windows display-affinity protection through Electron |
| API-key protection | Encrypts saved keys with Windows DPAPI through Electron safeStorage |
| Installer | Per-user NSIS installation with selectable installation folder |
| Portable version | ZIP package containing the unpacked x64 application |
| Windows build automation | Tests and packages the application on a Windows GitHub Actions runner |

## Requirements

- Windows 11 x64
- Internet connection
- A supported provider API key
- Microphone permission for listening features
- Node.js 20 or newer only when running from source

## Download and install

1. Open the [Windows 11 build workflow](https://github.com/oranegonzales/cue/actions/workflows/windows.yml).
2. Select the newest successful build.
3. Download the `cue-windows-11-x64` artifact.
4. Extract the downloaded artifact ZIP.
5. Run `cue-windows-11-0.2.1-x64.exe` for the normal installer.

The artifact also contains `cue-windows-11-0.2.1-x64.zip` for portable use.

The installer does not require administrator access. Builds are currently unsigned, so Windows SmartScreen may show an unrecognized-app warning. Only install artifacts produced by this repository and a commit you trust.

## First launch

1. Start Cue from the Start menu or desktop shortcut.
2. Click the Cue logo to open the setup guide.
3. Press `Ctrl` + `,` to open Settings.
4. Choose OpenAI, Anthropic, or Gemini and enter your API key.
5. Allow Windows microphone access when requested.
6. Test screen analysis and listening before using Cue in a meeting.

Gemini defaults to `gemini-3.1-flash-lite` for fast responses and transcription. Smart mode uses `gemini-3.5-flash`. Saved Gemini 2.5 model settings are migrated automatically.

## Listen to Zoom and other meeting applications

1. Join the meeting using computer audio.
2. In the meeting application's audio settings, select the same speaker device used under **Windows Settings > System > Sound > Output**.
3. Click the listening button in Cue's top bar.
4. Confirm that the green listening indicator appears.
5. Audio played by the meeting application is recorded as **Them**.
6. Speech from your microphone is recorded as **You**.
7. Click **What should I say?** or use Assist after the other person finishes speaking.

Headphones usually produce the cleanest separation. Other sounds played by Windows may also be captured, so mute unrelated applications while listening.

## Windows shortcuts

| Action | Shortcut |
|---|---|
| Assist using the current screen and conversation | `Ctrl` + `Enter` |
| Solve a coding problem visible on screen | `Ctrl` + `Alt` + `H` |
| Open Settings while Cue has focus | `Ctrl` + `,` |
| Quit Cue | `Ctrl` + `Shift` + `X` |

Move the mouse onto the monitor containing the relevant content before using a screen shortcut. Cue captures the display under the pointer.

Keep **Smart** off for the quickest response. Turn it on when a more detailed answer is more important than response speed.

## Run from source on Windows

Open PowerShell and run:

```powershell
git clone https://github.com/oranegonzales/cue.git
cd cue
npm ci
npm start
```

Build the Windows installer and portable ZIP with:

```powershell
npm run dist:win
```

The finished files are written to the `dist` folder.

## Privacy and security

- API keys are encrypted for the current Windows user with DPAPI.
- Legacy plaintext keys are migrated to protected storage after launch.
- Cue has no application server or telemetry service.
- Screenshots, audio clips, prompts, and transcripts are sent directly to the selected AI provider when a related feature is used.
- The renderer uses context isolation, process sandboxing, restricted navigation, restricted IPC, and controlled media permissions.
- Screenshots and audio are not stored as permanent recordings by Cue.

See [SECURITY.md](SECURITY.md) for more information.

## Testing

Run the local validation suite with:

```powershell
npm test
npm audit --audit-level=high
```

The GitHub Actions workflow repeats the tests on Windows and creates the installer and portable package.

## Known limitations

- Screen-capture protection cannot be guaranteed for every Windows update, application, or capture mode.
- The installer is not yet signed with a commercial Windows code-signing certificate.
- System-audio loopback captures other audio playing through the selected Windows output device.
- Changing the Windows output device while listening may require stopping and restarting listening.
- The default automated build targets Windows 11 x64.

## Origin and license

This project began as a fork of [Blueturboguy07/cue](https://github.com/Blueturboguy07/cue), which was originally developed for macOS. This repository adapts that project into a Windows 11 application while preserving the upstream history and attribution.

Licensed under [GPL-3.0-or-later](LICENSE). If you distribute a compiled build, retain the license and modification notices and provide the corresponding source code.
