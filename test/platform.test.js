const test = require('node:test');
const assert = require('node:assert/strict');
const { getPlatformInfo, getSettingsUri } = require('../src/platform');

test('Windows configuration uses Windows 11 capabilities and shortcuts', () => {
  const config = getPlatformInfo('win32');
  assert.equal(config.name, 'Windows 11');
  assert.equal(config.systemAudioSupported, true);
  assert.equal(config.contentProtectionSupported, true);
  assert.deepEqual(config.shortcuts.assist.keys, ['Ctrl', 'Enter']);
  assert.equal(config.shortcuts.solve.accelerator, 'Control+Alt+H');
});

test('system settings links are restricted to known actions', () => {
  assert.equal(getSettingsUri('microphone', 'win32'), 'ms-settings:privacy-microphone');
  assert.equal(getSettingsUri('unknown', 'win32'), null);
  assert.equal(getSettingsUri('microphone', 'linux'), null);
});

test('macOS does not advertise Windows-only loopback audio', () => {
  const config = getPlatformInfo('darwin');
  assert.equal(config.systemAudioSupported, false);
  assert.equal(config.screenPermissionRequired, true);
});
