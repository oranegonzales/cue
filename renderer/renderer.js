(function () {
  const { icon } = window.ICONS;
  const cue = window.cue;
  const $ = (s) => document.querySelector(s);

  $('#logo-btn').innerHTML = icon('logo', { size: 18 });
  $('.tb-hide .chev').innerHTML = icon('chevron-down', { size: 14 });
  $('#stop-btn').innerHTML = icon('stop-square', { size: 15 });
  document.querySelector('.act[data-mode="assist"] .ic').innerHTML = icon('sparkles', { size: 16 });
  document.querySelector('.act[data-mode="say"] .ic').innerHTML = icon('wand-sparkles', { size: 16 });
  document.querySelector('.act[data-mode="followup"] .ic').innerHTML = icon('message-circle', { size: 16 });
  document.querySelector('.act[data-mode="recap"] .ic').innerHTML = icon('refresh-cw', { size: 16 });
  $('#smart-toggle .ic').innerHTML = icon('zap', { size: 14 });
  $('#more-btn').innerHTML = icon('more-horizontal', { size: 18 });
  $('#send-btn').innerHTML = icon('play', { size: 15 });

  let settings = null;
  let platform = {
    platform: 'win32',
    name: 'Windows 11',
    modifier: 'Ctrl',
    settingsModifier: 'Ctrl',
    systemAudioSupported: true,
    screenPermissionRequired: false,
    contentProtectionSupported: true,
    shortcuts: {
      assist: { keys: ['Ctrl', 'Enter'] },
      solve: { keys: ['Ctrl', 'Alt', 'H'] },
      quit: { keys: ['Ctrl', 'Shift', 'X'] }
    }
  };
  let busy = false;
  let aiEl = null;
  let caretEl = null;

  const messages = $('#messages');

  function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function keyMarkup(keys) {
    return keys.map((key) => '<span class="kbd">' + esc(key) + '</span>').join(' ');
  }

  function applyPlatformUi() {
    $('#assist-key-mod').textContent = platform.modifier;
    document.title = 'cue for ' + platform.name;
  }

  function renderMarkdown(text) {
    const lines = text.split('\n');
    let html = '', inCode = false, inList = false, buf = [];
    const flushP = () => { if (buf.length) { html += '<p>' + inline(buf.join(' ')) + '</p>'; buf = []; } };
    const inline = (s) => esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    for (const raw of lines) {
      const line = raw;
      if (/^```/.test(line.trim())) {
        if (!inCode) { flushP(); if (inList) { html += '</ul>'; inList = false; } html += '<pre><code>'; inCode = true; }
        else { html += '</code></pre>'; inCode = false; }
        continue;
      }
      if (inCode) { html += esc(line) + '\n'; continue; }
      if (/^\s*[-*]\s+/.test(line)) { flushP(); if (!inList) { html += '<ul>'; inList = true; } html += '<li>' + inline(line.replace(/^\s*[-*]\s+/, '')) + '</li>'; continue; }
      if (line.trim() === '') { flushP(); if (inList) { html += '</ul>'; inList = false; } continue; }
      buf.push(line.trim());
    }
    flushP(); if (inList) html += '</ul>'; if (inCode) html += '</code></pre>';
    return html;
  }

  function clearMessages() { messages.innerHTML = ''; aiEl = null; caretEl = null; }

  function addUserBubble(text) {
    const b = document.createElement('div');
    b.className = 'user-bubble';
    b.textContent = text;
    messages.appendChild(b);
  }

  function startAi(small) {
    aiEl = document.createElement('div');
    aiEl.className = 'ai-text' + (small ? ' small' : '');
    aiEl.dataset.raw = '';
    caretEl = document.createElement('span');
    caretEl.className = 'ai-caret';
    aiEl.appendChild(caretEl);
    messages.appendChild(aiEl);
  }

  function appendToken(t) {
    if (!aiEl) startAi(false);
    aiEl.dataset.raw += t;
    const span = document.createElement('span');
    span.className = 'w';
    span.textContent = t;
    aiEl.insertBefore(span, caretEl);
  }

  function finalizeAi() {
    if (!aiEl) return;
    const raw = aiEl.dataset.raw || '';
    aiEl.innerHTML = renderMarkdown(raw);
    aiEl = null; caretEl = null;
  }

  function setBusy(v) { busy = v; $('#send-btn').classList.toggle('busy', v); }

  function runMode(mode, text) {
    if (busy) return;
    setBusy(true);
    cue.ask({ mode, text: text || '' });
  }

  document.querySelectorAll('.act').forEach((btn) => {
    btn.addEventListener('click', () => runMode(btn.dataset.mode, ''));
  });

  const input = $('#input');
  const placeholder = $('#placeholder');
  const composer = $('#composer');

  function syncPlaceholder() {
    placeholder.classList.toggle('hidden', input.value.length > 0 || document.activeElement === input);
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  }
  input.addEventListener('input', syncPlaceholder);
  input.addEventListener('focus', () => { composer.classList.add('focused'); placeholder.classList.add('hidden'); });
  input.addEventListener('blur', () => { composer.classList.remove('focused'); syncPlaceholder(); });
  $('#input-area').addEventListener('click', () => input.focus());

  function send() {
    const text = input.value.trim();
    if (!text) { runMode('assist', ''); return; }
    input.value = ''; syncPlaceholder();
    runMode('ask', text);
  }
  $('#send-btn').addEventListener('click', send);
  input.addEventListener('keydown', (e) => {
    const commandKey = e.metaKey || e.ctrlKey;
    if (e.key === 'Enter' && commandKey) {
      e.preventDefault();
      runMode('assist', '');
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  const smartBtn = $('#smart-toggle');
  smartBtn.addEventListener('click', async () => {
    settings.smart = !settings.smart;
    smartBtn.classList.toggle('on', settings.smart);
    await cue.settingsSet({ smart: settings.smart });
  });

  $('#hide-btn').addEventListener('click', () => {
    const collapsed = $('#panel').classList.toggle('collapsed');
    $('#hide-btn').classList.toggle('collapsed', collapsed);
    $('#live-dot').style.display = collapsed ? 'none' : '';
  });

  let captureWanted = false;

  $('#stop-btn').addEventListener('click', () => {
    const turningOn = !$('#stop-btn').classList.contains('active');
    captureWanted = turningOn;
    if (turningOn && platform.systemAudioSupported) startSystemAudio();
    cue.captureToggle();
  });

  let audioCtx = null, micStream = null, micNode = null, micProc = null, micStartPromise = null;
  async function startMic() {
    if (micStream) return true;
    if (micStartPromise) return micStartPromise;
    micStartPromise = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
        if (!captureWanted) {
          stream.getTracks().forEach((track) => track.stop());
          return false;
        }
        micStream = stream;
        audioCtx = new AudioContext({ sampleRate: 16000, latencyHint: 'interactive' });
        await audioCtx.resume();
        micNode = audioCtx.createMediaStreamSource(micStream);
        micProc = audioCtx.createScriptProcessor(4096, 1, 1);
        const sink = audioCtx.createGain();
        sink.gain.value = 0;
        micNode.connect(micProc);
        micProc.connect(sink);
        sink.connect(audioCtx.destination);
        micProc.onaudioprocess = (e) => {
          const f = e.inputBuffer.getChannelData(0);
          const out = new Int16Array(f.length);
          for (let i = 0; i < f.length; i++) { const s = Math.max(-1, Math.min(1, f[i])); out[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
          cue.micPcm(out.buffer);
        };
        return true;
      } catch (err) {
        cue.captureError('Microphone', err && err.message ? err.message : 'Access failed.');
        return false;
      } finally {
        micStartPromise = null;
      }
    })();
    return micStartPromise;
  }
  function stopMic() {
    if (micProc) { micProc.disconnect(); micProc.onaudioprocess = null; micProc = null; }
    if (micNode) { micNode.disconnect(); micNode = null; }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
  }

  let sysStream = null, sysCtx = null, sysNode = null, sysProc = null, sysStartPromise = null;
  async function startSystemAudio() {
    if (!platform.systemAudioSupported) return false;
    if (sysStream) return true;
    if (sysStartPromise) return sysStartPromise;
    sysStartPromise = (async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        stream.getVideoTracks().forEach((track) => track.stop());
        const tracks = stream.getAudioTracks();
        if (!tracks.length) {
          stream.getTracks().forEach((track) => track.stop());
          cue.captureError('System audio', 'Windows did not provide a loopback audio track.');
          return false;
        }
        if (!captureWanted) {
          stream.getTracks().forEach((track) => track.stop());
          return false;
        }
        sysStream = stream;
        sysCtx = new AudioContext({ sampleRate: 16000, latencyHint: 'interactive' });
        await sysCtx.resume();
        sysNode = sysCtx.createMediaStreamSource(new MediaStream(tracks));
        sysProc = sysCtx.createScriptProcessor(4096, 1, 1);
        const sink = sysCtx.createGain();
        sink.gain.value = 0;
        sysNode.connect(sysProc);
        sysProc.connect(sink);
        sink.connect(sysCtx.destination);
        sysProc.onaudioprocess = (e) => {
          const f = e.inputBuffer.getChannelData(0);
          const out = new Int16Array(f.length);
          for (let i = 0; i < f.length; i++) { const s = Math.max(-1, Math.min(1, f[i])); out[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
          cue.systemPcm(out.buffer);
        };
        cue.log('System audio loopback is active.');
        return true;
      } catch (err) {
        cue.captureError('System audio', err && err.message ? err.message : 'Loopback capture failed.');
        return false;
      } finally {
        sysStartPromise = null;
      }
    })();
    return sysStartPromise;
  }
  function stopSystemAudio() {
    if (sysProc) { sysProc.disconnect(); sysProc.onaudioprocess = null; sysProc = null; }
    if (sysNode) { sysNode.disconnect(); sysNode = null; }
    if (sysCtx) { sysCtx.close(); sysCtx = null; }
    if (sysStream) { sysStream.getTracks().forEach((t) => t.stop()); sysStream = null; }
  }

  cue.on('capture:state', ({ active }) => {
    captureWanted = active;
    $('#live-dot').classList.toggle('off', !active);
    $('#stop-btn').classList.toggle('active', active);
    if (active) {
      startMic();
      if (platform.systemAudioSupported) startSystemAudio();
    } else {
      stopMic();
      stopSystemAudio();
    }
  });
  cue.on('llm:start', ({ userBubble, small }) => {
    clearMessages();
    if (userBubble) addUserBubble(userBubble);
    startAi(!!small);
    setBusy(true);
  });
  cue.on('llm:token', ({ text }) => appendToken(text));
  cue.on('llm:done', () => { finalizeAi(); setBusy(false); });
  cue.on('llm:error', ({ message }) => {
    if (!aiEl) startAi(true);
    aiEl.dataset.raw = message; finalizeAi(); setBusy(false);
  });
  let statusTimer = null;
  function showStatus(message) {
    let el = document.getElementById('cue-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cue-status';
      const panel = document.getElementById('panel');
      panel.insertBefore(el, document.getElementById('action-row'));
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => el.classList.remove('show'), 11000);
  }
  cue.on('status', ({ message }) => { cue.log('[status] ' + message); showStatus(message); });

  const scrim = $('#settings-scrim');
  function openSettings() { fillSettings(); scrim.classList.remove('hidden'); }
  function closeSettings() { saveSettings(); scrim.classList.add('hidden'); }
  $('#more-btn').addEventListener('click', openSettings);
  $('#s-close').addEventListener('click', closeSettings);
  scrim.addEventListener('click', (e) => { if (e.target === scrim) closeSettings(); });

  function fillSettings() {
    document.querySelectorAll('#provider-seg button').forEach((b) => b.classList.toggle('on', b.dataset.provider === settings.provider));
    $('#key-openai').value = settings.apiKeys.openai || '';
    $('#key-anthropic').value = settings.apiKeys.anthropic || '';
    $('#key-gemini').value = settings.apiKeys.gemini || '';
    const m = settings.models[settings.provider] || { fast: '', smart: '' };
    $('#model-fast').value = m.fast; $('#model-smart').value = m.smart;
    $('#s-status').textContent = statusText();
  }
  function statusText() {
    const k = settings.apiKeys;
    const has = [k.openai && 'OpenAI', k.anthropic && 'Anthropic', k.gemini && 'Gemini'].filter(Boolean);
    const stt = k.openai ? 'OpenAI speech' : (k.gemini ? 'Gemini' : 'none');
    const storage = settings.keyStorage === 'protected' ? 'OS protected' : 'local file';
    return 'Active: ' + settings.provider + ' · keys: ' + (has.join(', ') || 'none set') + ' · transcription: ' + stt + ' · storage: ' + storage;
  }
  document.querySelectorAll('#provider-seg button').forEach((b) => b.addEventListener('click', () => {
    settings.provider = b.dataset.provider;
    document.querySelectorAll('#provider-seg button').forEach((x) => x.classList.toggle('on', x === b));
    const m = settings.models[settings.provider] || { fast: '', smart: '' };
    $('#model-fast').value = m.fast; $('#model-smart').value = m.smart;
    $('#s-status').textContent = statusText();
  }));
  async function saveSettings() {
    settings.apiKeys.openai = $('#key-openai').value.trim();
    settings.apiKeys.anthropic = $('#key-anthropic').value.trim();
    settings.apiKeys.gemini = $('#key-gemini').value.trim();
    if (!settings.models[settings.provider]) settings.models[settings.provider] = {};
    settings.models[settings.provider].fast = $('#model-fast').value.trim();
    settings.models[settings.provider].smart = $('#model-smart').value.trim();
    await cue.settingsSet(settings);
  }

  function showExample() {
    clearMessages();
    addUserBubble('What should I say?');
    const ai = document.createElement('div');
    ai.className = 'ai-text';
    ai.textContent = '“A discounted cash flow model values a company by projecting future free cash flows and discounting them to present value using the weighted average cost of capital.”';
    messages.appendChild(ai);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !scrim.classList.contains('hidden')) closeSettings();
    if ((e.metaKey || e.ctrlKey) && e.key === ',') { e.preventDefault(); openSettings(); }
  });

  let ignoring = null;
  function setIgnore(v) { if (v !== ignoring) { ignoring = v; cue.setIgnoreMouse(v); } }
  document.addEventListener('mousemove', (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const overUI = !!(el && el.closest && el.closest('#toolbar, #panel-wrap, #settings-scrim, #onboard-scrim'));
    setIgnore(!overUI);
  });
  setIgnore(true);

  const obScrim = $('#onboard-scrim');
  let OB_STEPS = [];

  function buildOnboardSteps() {
    const welcome = {
      icon: 'C',
      title: 'Welcome to cue',
      body: 'cue is a private AI copilot that floats over your screen. It can <strong>see your screen</strong>, <strong>hear your meetings</strong>, and help with questions or coding problems.<br><br>This quick guide gets you running in about a minute.'
    };
    const provider = {
      icon: '2',
      title: 'Connect an AI provider',
      body: 'cue uses <strong>your own</strong> API key. Pick <span class="hl">OpenAI</span>, <span class="hl">Anthropic</span>, or <span class="hl">Google Gemini</span>, then paste the key into Settings.<br><br>Listening needs speech-to-text access through OpenAI or Gemini. A chat-only key still powers screen and coding help.',
      buttons: [{ label: 'Open cue Settings', action: () => { finishOnboard(); openSettings(); } }]
    };
    const ready = {
      icon: '4',
      title: 'You are all set',
      body: 'How to use cue:<ul><li>' + keyMarkup(platform.shortcuts.assist.keys) + ' for <strong>Assist</strong></li><li>' + keyMarkup(platform.shortcuts.solve.keys) + ' to solve a coding problem on screen</li><li>Click the stop-square button in the top bar to start listening</li><li>Type a question and press ' + keyMarkup(['Enter']) + '</li></ul>Click the <strong>cue logo</strong> to reopen this guide. Quit with ' + keyMarkup(platform.shortcuts.quit.keys) + '.'
    };

    if (platform.platform === 'win32') {
      return [
        welcome,
        {
          icon: '1',
          title: 'Allow microphone access',
          body: 'Windows 11 may ask for microphone access when listening starts. Make sure <strong>Microphone access</strong> and <strong>Let desktop apps access your microphone</strong> are enabled.<br><br>Meeting audio is captured separately through Windows system-audio loopback.',
          buttons: [
            { label: 'Open Microphone privacy settings', action: () => cue.openSystemSettings('microphone') },
            { label: 'Open Sound settings', action: () => cue.openSystemSettings('sound') }
          ]
        },
        provider,
        {
          icon: '3',
          title: 'Screen-share privacy',
          body: 'cue asks Windows 11 to exclude its window from screen capture. This is <strong>best effort</strong>, and some capture tools or modes may still show cue or a blank area.<br><br>Test your exact sharing setup first. Do not use cue where hidden assistance breaks exam, interview, meeting, or consent rules.'
        },
        ready
      ];
    }

    if (platform.platform === 'darwin') {
      return [
        welcome,
        {
          icon: '1',
          title: 'Allow cue to see and hear',
          body: 'cue needs macOS access to the microphone and screen recording. Turn <strong>cue</strong> on in both privacy pages.',
          buttons: [
            { label: 'Open Microphone settings', action: () => cue.openSystemSettings('microphone') },
            { label: 'Open Screen Recording settings', action: () => cue.openSystemSettings('screen') }
          ]
        },
        provider,
        {
          icon: '3',
          title: 'Screen-share privacy',
          body: 'Content protection is best effort. Modern macOS capture tools may still include the cue window. Test your exact sharing setup first.'
        },
        ready
      ];
    }

    return [
      welcome,
      {
        icon: '1',
        title: 'Capture support',
        body: 'This build prioritizes Windows 11. Microphone input may work on Linux, but protected windows and system-audio loopback are not supported by this version.'
      },
      provider,
      ready
    ];
  }
  let obIndex = 0;
  function renderOnboard() {
    const step = OB_STEPS[obIndex];
    $('#ob-icon').textContent = step.icon;
    $('#ob-title').textContent = step.title;
    $('#ob-body').innerHTML = step.body;
    const btns = $('#ob-buttons'); btns.innerHTML = '';
    (step.buttons || []).forEach((b) => { const el = document.createElement('button'); el.textContent = b.label; el.addEventListener('click', b.action); btns.appendChild(el); });
    const dots = $('#ob-dots'); dots.innerHTML = '';
    OB_STEPS.forEach((_, i) => { const d = document.createElement('span'); if (i === obIndex) d.className = 'on'; dots.appendChild(d); });
    $('#ob-back').style.visibility = obIndex === 0 ? 'hidden' : 'visible';
    $('#ob-next').textContent = obIndex === OB_STEPS.length - 1 ? 'Done' : 'Next';
    $('#ob-skip').style.visibility = obIndex === OB_STEPS.length - 1 ? 'hidden' : 'visible';
  }
  function showOnboard() { obIndex = 0; renderOnboard(); obScrim.classList.remove('hidden'); setIgnore(false); }
  async function finishOnboard() {
    obScrim.classList.add('hidden');
    if (settings && !settings.onboarded) { settings.onboarded = true; await cue.settingsSet({ onboarded: true }); }
  }
  $('#ob-next').addEventListener('click', () => { if (obIndex === OB_STEPS.length - 1) finishOnboard(); else { obIndex++; renderOnboard(); } });
  $('#ob-back').addEventListener('click', () => { if (obIndex > 0) { obIndex--; renderOnboard(); } });
  $('#ob-skip').addEventListener('click', finishOnboard);
  $('#logo-btn').addEventListener('click', showOnboard);

  (async function boot() {
    platform = await cue.platformGet();
    applyPlatformUi();
    OB_STEPS = buildOnboardSteps();
    settings = await cue.settingsGet();
    smartBtn.classList.toggle('on', !!settings.smart);
    showExample();
    syncPlaceholder();
    const st = await cue.captureState();
    $('#live-dot').classList.toggle('off', !st.active);
    $('#stop-btn').classList.toggle('active', st.active);
    if (!settings.onboarded) showOnboard();
  })();
})();
