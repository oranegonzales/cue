const {
  app,
  BrowserWindow,
  desktopCapturer,
  globalShortcut,
  ipcMain,
  screen,
  session,
  shell
} = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const store = require('./src/store');
const { captureScreenshot } = require('./src/screen');
const { createSTT } = require('./src/stt');
const { createLLM } = require('./src/llm');
const { MODES } = require('./src/prompts');
const { rms16 } = require('./src/wav');
const { getPlatformInfo, getSettingsUri } = require('./src/platform');

const platformInfo = getPlatformInfo();
const rendererPath = path.join(__dirname, 'renderer', 'index.html');
const rendererUrl = pathToFileURL(rendererPath).href;
const state = { capturing: false, busy: false, transcribing: { you: false, them: false } };
const buffers = { you: [], them: [] };
const transcript = [];
const FLUSH_MS = 3500;
const MIN_BYTES = Math.floor(16000 * 2 * 0.6);
const RMS_GATE = 240;
const MAX_PCM_CHUNK_BYTES = 2 * 1024 * 1024;
const MAX_USER_TEXT = 20000;

let win = null;
let sttDisabled = false;
let flushTimer = null;
let shortcutFailures = [];

function send(channel, data) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}

function isTrustedUrl(value) {
  try {
    return new URL(value).href === rendererUrl;
  } catch {
    return false;
  }
}

function isTrustedEvent(event) {
  return Boolean(
    win &&
    !win.isDestroyed() &&
    event.sender === win.webContents &&
    event.senderFrame &&
    isTrustedUrl(event.senderFrame.url)
  );
}

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = 700;
  const height = 600;
  win = new BrowserWindow({
    width,
    height,
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: workArea.y + 6,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      devTools: !app.isPackaged
    }
  });

  if (platformInfo.contentProtectionSupported) {
    win.setContentProtection(process.env.CUE_NO_PROTECT !== '1');
  }
  win.setAlwaysOnTop(true, 'screen-saver', 1);
  if (process.platform !== 'win32') {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  if (process.platform === 'darwin' && typeof win.setHiddenInMissionControl === 'function') {
    win.setHiddenInMissionControl(true);
  }

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedUrl(url)) event.preventDefault();
  });
  win.webContents.on('will-attach-webview', (event) => event.preventDefault());
  win.webContents.on('did-finish-load', () => {
    win.showInactive();
    for (const accelerator of shortcutFailures) {
      send('status', { message: platformInfo.name + ' could not register ' + accelerator + '. Another app may already use it.' });
    }
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('[cue] renderer stopped', JSON.stringify(details));
  });
  win.on('closed', () => {
    win = null;
  });
  win.loadFile(rendererPath);
}

async function flushChannel(channel) {
  if (state.transcribing[channel]) return;
  const chunks = buffers[channel];
  if (!chunks.length) return;
  const pcm = Buffer.concat(chunks);
  buffers[channel] = [];
  if (pcm.length < MIN_BYTES || rms16(pcm) < RMS_GATE) return;
  state.transcribing[channel] = true;
  try {
    const settings = await store.getSettings();
    const stt = createSTT(settings);
    if (!stt.available) {
      if (!sttDisabled) {
        sttDisabled = true;
        send('status', { message: 'No transcription key is set. Add an OpenAI or Gemini key in Settings.' });
      }
      return;
    }
    const result = await stt.transcribe(pcm);
    if (result.error) {
      handleSttError(result.error);
      return;
    }
    if (result.text && result.text.trim()) {
      const turn = { channel, text: result.text.trim(), ts: Date.now() };
      transcript.push(turn);
      send('transcript', turn);
    }
  } catch (error) {
    console.error('[cue] transcription error', error && error.message);
  } finally {
    state.transcribing[channel] = false;
  }
}

function handleSttError(error) {
  if (sttDisabled) return;
  sttDisabled = true;
  const noAccess = error.status === 403 || error.status === 401 || error.code === 'model_not_found';
  const message = noAccess
    ? 'Transcription is off because the selected key cannot access a speech-to-text model.'
    : 'Transcription error from ' + error.provider + ': ' + error.message;
  send('status', { message });
}

function startFlushLoop() {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    void flushChannel('you');
    void flushChannel('them');
  }, FLUSH_MS);
}

function stopFlushLoop() {
  if (!flushTimer) return;
  clearInterval(flushTimer);
  flushTimer = null;
}

function setCapturing(active) {
  state.capturing = Boolean(active);
  if (state.capturing) {
    startFlushLoop();
  } else {
    stopFlushLoop();
    buffers.you = [];
    buffers.them = [];
  }
  send('capture:state', { active: state.capturing });
  return state.capturing;
}

async function runFeature(mode, userText) {
  if (state.busy) return;
  const definition = MODES[mode];
  if (!definition) return;
  state.busy = true;
  try {
    const settings = await store.getSettings();
    const llm = createLLM(settings);
    const userBubble = definition.userBubble !== null
      ? definition.userBubble
      : mode === 'ask' ? userText : null;
    send('llm:start', { userBubble, small: Boolean(definition.small) });
    if (!llm.ready) {
      send('llm:error', {
        message: 'Add your ' + settings.provider + ' API key in Settings. Model: ' + (llm.model || 'unset') + '.'
      });
      return;
    }

    let imageDataUrl = null;
    if (definition.needsScreen) {
      try {
        imageDataUrl = await captureScreenshot();
      } catch {
        const message = process.platform === 'win32'
          ? 'Screen capture failed. Restart cue and check Windows graphics capture permissions.'
          : 'Screen capture failed. Check the operating system screen-recording permission.';
        send('status', { message });
      }
    }

    const built = definition.build({ transcript, userText: userText || '' });
    await llm.stream({
      system: definition.system,
      turns: [{ role: 'user', text: built }],
      imageDataUrl,
      onToken: (text) => send('llm:token', { text })
    });
    send('llm:done', {});
  } catch (error) {
    send('llm:error', { message: 'Error: ' + (error && error.message ? error.message : String(error)) });
  } finally {
    state.busy = false;
  }
}

function registerIpc() {
  const handle = (channel, action) => {
    ipcMain.handle(channel, async (event, ...args) => {
      if (!isTrustedEvent(event)) throw new Error('Untrusted IPC sender');
      return action(...args);
    });
  };

  handle('settings:get', () => store.getSettings());
  handle('settings:set', async (patch) => {
    sttDisabled = false;
    return store.setSettings(patch);
  });
  handle('platform:get', () => platformInfo);
  handle('capture:toggle', () => setCapturing(!state.capturing));
  handle('capture:state', () => ({ active: state.capturing }));
  handle('system-settings:open', async (action) => {
    const uri = getSettingsUri(action);
    if (!uri) return false;
    await shell.openExternal(uri);
    return true;
  });

  ipcMain.on('ask', (event, payload) => {
    if (!isTrustedEvent(event) || !payload || typeof payload !== 'object') return;
    const mode = typeof payload.mode === 'string' ? payload.mode : '';
    const text = typeof payload.text === 'string' ? payload.text.slice(0, MAX_USER_TEXT) : '';
    void runFeature(mode, text);
  });
  ipcMain.on('mic:pcm', (event, arrayBuffer) => {
    if (!isTrustedEvent(event) || !state.capturing || !(arrayBuffer instanceof ArrayBuffer)) return;
    if (arrayBuffer.byteLength > MAX_PCM_CHUNK_BYTES) return;
    buffers.you.push(Buffer.from(arrayBuffer));
  });
  ipcMain.on('system:pcm', (event, arrayBuffer) => {
    if (!isTrustedEvent(event) || !state.capturing || !(arrayBuffer instanceof ArrayBuffer)) return;
    if (arrayBuffer.byteLength > MAX_PCM_CHUNK_BYTES) return;
    buffers.them.push(Buffer.from(arrayBuffer));
  });
  ipcMain.on('mouse:ignore', (event, value) => {
    if (!isTrustedEvent(event) || !win) return;
    win.setIgnoreMouseEvents(Boolean(value), { forward: true });
  });
  ipcMain.on('capture:error', (event, payload) => {
    if (!isTrustedEvent(event) || !payload || typeof payload !== 'object') return;
    const source = typeof payload.source === 'string' ? payload.source.slice(0, 40) : 'capture';
    const message = typeof payload.message === 'string' ? payload.message.slice(0, 500) : 'Capture failed.';
    send('status', { message: source + ': ' + message });
  });
  ipcMain.on('log', (event, message) => {
    if (!isTrustedEvent(event) || typeof message !== 'string') return;
    console.log('[cue]', message.slice(0, 1000));
  });
}

function registerShortcuts() {
  shortcutFailures = [];
  const actions = [
    [platformInfo.shortcuts.assist.accelerator, () => void runFeature('assist', '')],
    [platformInfo.shortcuts.solve.accelerator, () => void runFeature('leetcode', '')],
    [platformInfo.shortcuts.quit.accelerator, () => app.quit()]
  ];
  for (const [accelerator, action] of actions) {
    if (!globalShortcut.register(accelerator, action)) shortcutFailures.push(accelerator);
  }
}

function configureSession() {
  const allowedPermissions = new Set(['media', 'microphone', 'audioCapture', 'display-capture']);
  const trustedContents = (contents) => Boolean(win && contents === win.webContents && isTrustedUrl(contents.getURL()));
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
    callback(trustedContents(contents) && allowedPermissions.has(permission));
  });
  session.defaultSession.setPermissionCheckHandler((contents, permission) => {
    return trustedContents(contents) && allowedPermissions.has(permission);
  });
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    if (!win || !request.frame || request.frame !== win.webContents.mainFrame || !isTrustedUrl(request.frame.url)) {
      callback();
      return;
    }
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      if (!sources.length) {
        callback();
        return;
      }
      const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
      const source = sources.find((item) => String(item.display_id) === String(display.id)) || sources[0];
      const streams = { video: source };
      if (process.platform === 'win32') streams.audio = 'loopback';
      callback(streams);
    }).catch(() => callback());
  }, { useSystemPicker: false });
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.showInactive();
  });

  app.whenReady().then(async () => {
    await store.init();
    if (app.dock) app.dock.hide();
    registerIpc();
    configureSession();
    createWindow();
    registerShortcuts();
  }).catch((error) => {
    console.error('[cue] startup failed', error);
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => app.quit());
}
