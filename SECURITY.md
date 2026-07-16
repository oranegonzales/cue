# Security

## API keys

On Windows, cue encrypts API keys with the current Windows user's DPAPI credentials through Electron safeStorage. The settings file is stored inside the Electron user-data directory. Keys are decrypted only while cue is running.

## Screen and audio data

cue has no application server. Screenshots, audio clips, and prompts are sent directly to the AI provider selected in Settings. Review that provider's data policy before use.

## Screen capture protection

Content protection is best effort. Windows and capture applications can change behavior, and cue cannot guarantee that its window will be absent from every recording or share. Test the exact application and capture mode before relying on it.

## Reporting a vulnerability

Open a private security advisory on the repository when available. Do not include API keys, recordings, screenshots, or other sensitive information in a public issue.
