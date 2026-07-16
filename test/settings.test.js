const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULTS, applyPatch } = require('../src/settings');

test('settings accept supported provider data', () => {
  const result = applyPatch(DEFAULTS, {
    provider: 'gemini',
    smart: true,
    apiKeys: { gemini: '  key-value  ' },
    models: { gemini: { fast: 'fast-model', smart: 'smart-model' } }
  });
  assert.equal(result.provider, 'gemini');
  assert.equal(result.smart, true);
  assert.equal(result.apiKeys.gemini, 'key-value');
  assert.equal(result.models.gemini.fast, 'fast-model');
});

test('settings ignore unknown fields and invalid providers', () => {
  const input = JSON.parse('{"provider":"unknown","__proto__":{"polluted":true},"extra":"value"}');
  const result = applyPatch(DEFAULTS, input);
  assert.equal(result.provider, 'openai');
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'extra'), false);
});

test('settings updates do not mutate defaults', () => {
  const result = applyPatch(DEFAULTS, { apiKeys: { openai: 'secret' } });
  assert.equal(result.apiKeys.openai, 'secret');
  assert.equal(DEFAULTS.apiKeys.openai, '');
});
