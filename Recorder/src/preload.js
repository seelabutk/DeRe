const { contextBridge, ipcRenderer } = require('electron');
const path = require("path");

const appInspect = require('./background/appInspect');
const addon = __non_webpack_require__('../../addon/main'); //why non_webpack_require? can I fix this with a loader? check vue.config.js.

const validChannels = ['READ_FILE', 'WRITE_FILE'];
contextBridge.exposeInMainWorld(
  'ipc', {
    send: (channel, data) => {
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    on: (channel, func) => {
      if (validChannels.includes(channel)) {
        // Strip event as it includes `sender` and is a security risk
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
  },
);
contextBridge.exposeInMainWorld('inspect', (()=>{
  const hwnd = addon.GetForegroundWindow();
  const ai = new appInspect(hwnd);
  Object.getOwnPropertyNames(ai.__proto__).forEach(v => {ai[v] = ai[v].bind(ai)}); //send prototypes as well
  return ai;
})());
contextBridge.exposeInMainWorld('addon', addon);
