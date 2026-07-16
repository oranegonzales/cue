const test = require('node:test');
const assert = require('node:assert/strict');

test('AI provider SDK entry points are available', () => {
  const OpenAI = require('openai');
  const Anthropic = require('@anthropic-ai/sdk');
  const { GoogleGenAI } = require('@google/genai');
  assert.equal(typeof OpenAI, 'function');
  assert.equal(typeof OpenAI.toFile, 'function');
  assert.equal(typeof Anthropic, 'function');
  assert.equal(typeof GoogleGenAI, 'function');
});
