const PLATFORM_CONFIG = {
  win32: {
    name: 'Windows 11',
    modifier: 'Ctrl',
    settingsModifier: 'Ctrl',
    systemAudioSupported: true,
    screenPermissionRequired: false,
    contentProtectionSupported: true,
    shortcuts: {
      assist: { accelerator: 'Control+Return', keys: ['Ctrl', 'Enter'] },
      solve: { accelerator: 'Control+Alt+H', keys: ['Ctrl', 'Alt', 'H'] },
      quit: { accelerator: 'Control+Shift+X', keys: ['Ctrl', 'Shift', 'X'] }
    }
  },
  darwin: {
    name: 'macOS',
    modifier: '⌘',
    settingsModifier: '⌘',
    systemAudioSupported: false,
    screenPermissionRequired: true,
    contentProtectionSupported: true,
    shortcuts: {
      assist: { accelerator: 'Command+Return', keys: ['⌘', 'Enter'] },
      solve: { accelerator: 'Command+H', keys: ['⌘', 'H'] },
      quit: { accelerator: 'Command+Shift+X', keys: ['⌘', 'Shift', 'X'] }
    }
  },
  linux: {
    name: 'Linux',
    modifier: 'Ctrl',
    settingsModifier: 'Ctrl',
    systemAudioSupported: false,
    screenPermissionRequired: false,
    contentProtectionSupported: false,
    shortcuts: {
      assist: { accelerator: 'Control+Return', keys: ['Ctrl', 'Enter'] },
      solve: { accelerator: 'Control+Alt+H', keys: ['Ctrl', 'Alt', 'H'] },
      quit: { accelerator: 'Control+Shift+X', keys: ['Ctrl', 'Shift', 'X'] }
    }
  }
};

const SETTINGS_URIS = {
  win32: {
    microphone: 'ms-settings:privacy-microphone',
    sound: 'ms-settings:sound'
  },
  darwin: {
    microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
    screen: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
  }
};

function getPlatformInfo(platform = process.platform) {
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.linux;
  return {
    platform,
    name: config.name,
    modifier: config.modifier,
    settingsModifier: config.settingsModifier,
    systemAudioSupported: config.systemAudioSupported,
    screenPermissionRequired: config.screenPermissionRequired,
    contentProtectionSupported: config.contentProtectionSupported,
    shortcuts: config.shortcuts,
    settingsActions: Object.keys(SETTINGS_URIS[platform] || {})
  };
}

function getSettingsUri(action, platform = process.platform) {
  const platformUris = SETTINGS_URIS[platform] || {};
  return typeof action === 'string' ? platformUris[action] || null : null;
}

module.exports = { getPlatformInfo, getSettingsUri };
