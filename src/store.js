const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');
const { PROVIDERS, DEFAULTS, applyPatch, clone } = require('./settings');

let data = null;
let encryptionAvailable = false;

function filePath() {
  return path.join(app.getPath('userData'), 'cue-data.json');
}

async function decryptKeys(protectedKeys) {
  const keys = clone(DEFAULTS.apiKeys);
  if (!encryptionAvailable || !protectedKeys || typeof protectedKeys !== 'object') return keys;
  for (const provider of PROVIDERS) {
    const encoded = protectedKeys[provider];
    if (typeof encoded !== 'string' || !encoded) continue;
    try {
      const decrypted = await safeStorage.decryptStringAsync(Buffer.from(encoded, 'base64'));
      keys[provider] = typeof decrypted.result === 'string' ? decrypted.result.slice(0, 10000).trim() : '';
    } catch {
      keys[provider] = '';
    }
  }
  return keys;
}

async function serialize() {
  const output = clone(data);
  const keys = output.apiKeys;
  delete output.apiKeys;
  if (encryptionAvailable) {
    output.protectedApiKeys = {};
    for (const provider of PROVIDERS) {
      if (!keys[provider]) continue;
      const encrypted = await safeStorage.encryptStringAsync(keys[provider]);
      output.protectedApiKeys[provider] = encrypted.toString('base64');
    }
  } else {
    output.apiKeys = keys;
  }
  return output;
}

async function save() {
  const output = await serialize();
  await fs.promises.mkdir(path.dirname(filePath()), { recursive: true });
  await fs.promises.writeFile(filePath(), JSON.stringify(output, null, 2), { encoding: 'utf8', mode: 0o600 });
}

async function init() {
  if (data) return;
  encryptionAvailable = await safeStorage.isAsyncEncryptionAvailable();
  let raw = {};
  try {
    raw = JSON.parse(await fs.promises.readFile(filePath(), 'utf8'));
  } catch {
    raw = {};
  }
  const protectedKeys = await decryptKeys(raw.protectedApiKeys);
  const legacyKeys = raw.apiKeys && typeof raw.apiKeys === 'object' ? raw.apiKeys : {};
  const keys = encryptionAvailable && raw.protectedApiKeys ? protectedKeys : legacyKeys;
  data = applyPatch(DEFAULTS, { ...raw, apiKeys: keys });
  if (encryptionAvailable && raw.apiKeys) await save();
}

async function getSettings() {
  await init();
  return { ...clone(data), keyStorage: encryptionAvailable ? 'protected' : 'plain' };
}

async function setSettings(patch) {
  await init();
  data = applyPatch(data, patch);
  await save();
  return getSettings();
}

module.exports = { init, getSettings, setSettings };
