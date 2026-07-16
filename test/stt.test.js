const test = require('node:test');
const assert = require('node:assert/strict');
const { GEMINI_TRANSCRIPTION_MODEL } = require('../src/stt');

test('Gemini transcription uses a current free-tier model', () => {
  assert.equal(GEMINI_TRANSCRIPTION_MODEL, 'gemini-3.1-flash-lite');
});
