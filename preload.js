const { contextBridge, ipcRenderer } = require('electron');

const allowedEvents = new Set([
  'capture:state',
  'llm:start',
  'llm:token',
  'llm:done',
  'llm:error',
  'status',
  'transcript'
]);

contextBridge.exposeInMainWorld('cue', {
  settingsGet: () => ipcRenderer.invoke('settings:get'),
  settingsSet: (patch) => ipcRenderer.invoke('settings:set', patch),
  platformGet: () => ipcRenderer.invoke('platform:get'),
  openSystemSettings: (action) => ipcRenderer.invoke('system-settings:open', action),
  ask: (payload) => ipcRenderer.send('ask', payload),
  captureToggle: () => ipcRenderer.invoke('capture:toggle'),
  captureState: () => ipcRenderer.invoke('capture:state'),
  captureError: (source, message) => ipcRenderer.send('capture:error', { source, message }),
  micPcm: (arrayBuffer) => ipcRenderer.send('mic:pcm', arrayBuffer),
  systemPcm: (arrayBuffer) => ipcRenderer.send('system:pcm', arrayBuffer),
  setIgnoreMouse: (value) => ipcRenderer.send('mouse:ignore', value),
  log: (message) => ipcRenderer.send('log', message),
  on: (channel, callback) => {
    if (!allowedEvents.has(channel) || typeof callback !== 'function') return;
    ipcRenderer.on(channel, (_event, data) => callback(data));
  }
});
