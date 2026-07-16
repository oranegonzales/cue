const test = require('node:test');
const assert = require('node:assert/strict');
const { pcmToWav, rms16 } = require('../src/wav');

test('pcmToWav creates a valid mono 16-bit WAV header', () => {
  const pcm = Buffer.alloc(3200);
  const wav = pcmToWav(pcm, 16000, 1);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt32LE(24), 16000);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.readUInt32LE(40), pcm.length);
});

test('rms16 distinguishes silence from audio', () => {
  const silence = Buffer.alloc(8);
  const audio = Buffer.alloc(8);
  audio.writeInt16LE(1000, 0);
  audio.writeInt16LE(-1000, 2);
  audio.writeInt16LE(1000, 4);
  audio.writeInt16LE(-1000, 6);
  assert.equal(rms16(silence), 0);
  assert.equal(rms16(audio), 1000);
});
