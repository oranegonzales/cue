const PROVIDERS = ['openai', 'anthropic', 'gemini'];
const MODEL_MIGRATIONS = {
  gemini: {
    'gemini-2.5-flash': 'gemini-3.1-flash-lite',
    'gemini-2.5-pro': 'gemini-3.5-flash'
  }
};
const DEFAULTS = {
  provider: 'openai',
  smart: false,
  onboarded: false,
  apiKeys: { openai: '', anthropic: '', gemini: '' },
  models: {
    openai: { fast: 'gpt-4o-mini', smart: 'gpt-4o' },
    anthropic: { fast: 'claude-haiku-4-5', smart: 'claude-sonnet-5' },
    gemini: { fast: 'gemini-3.1-flash-lite', smart: 'gemini-3.5-flash' }
  },
  sttModel: 'gpt-4o-mini-transcribe'
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanText(value, fallback = '', limit = 10000) {
  if (typeof value !== 'string') return fallback;
  return value.slice(0, limit);
}

function cleanModel(provider, value, fallback) {
  const model = cleanText(value, fallback, 200).trim();
  return MODEL_MIGRATIONS[provider] && MODEL_MIGRATIONS[provider][model]
    ? MODEL_MIGRATIONS[provider][model]
    : model;
}

function applyPatch(current, patch) {
  const next = clone(current || DEFAULTS);
  const input = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {};
  if (PROVIDERS.includes(input.provider)) next.provider = input.provider;
  if (typeof input.smart === 'boolean') next.smart = input.smart;
  if (typeof input.onboarded === 'boolean') next.onboarded = input.onboarded;
  if (input.apiKeys && typeof input.apiKeys === 'object' && !Array.isArray(input.apiKeys)) {
    for (const provider of PROVIDERS) {
      if (Object.prototype.hasOwnProperty.call(input.apiKeys, provider)) {
        next.apiKeys[provider] = cleanText(input.apiKeys[provider]).trim();
      }
    }
  }
  if (input.models && typeof input.models === 'object' && !Array.isArray(input.models)) {
    for (const provider of PROVIDERS) {
      const models = input.models[provider];
      if (!models || typeof models !== 'object' || Array.isArray(models)) continue;
      if (Object.prototype.hasOwnProperty.call(models, 'fast')) {
        next.models[provider].fast = cleanModel(provider, models.fast, next.models[provider].fast);
      }
      if (Object.prototype.hasOwnProperty.call(models, 'smart')) {
        next.models[provider].smart = cleanModel(provider, models.smart, next.models[provider].smart);
      }
    }
  }
  if (Object.prototype.hasOwnProperty.call(input, 'sttModel')) {
    next.sttModel = cleanText(input.sttModel, next.sttModel, 200).trim();
  }
  return next;
}

module.exports = { PROVIDERS, DEFAULTS, applyPatch, clone };
