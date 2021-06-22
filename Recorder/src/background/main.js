'use strict'

import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import path from 'path'
//import fs from 'fs'
import { EventEmitter } from 'events'

const appInspect = require('./appInspect');
const addon = __non_webpack_require__('../../addon/main');





const isDevelopment = process.env.NODE_ENV !== 'production'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
]);

const globalShare = {
  win: null,
  hwnd: null,
  ehwnd: null,
  appInspect: null,
  makeNewWindowSelectable: null,
  emitter: new EventEmitter(),
  addon: addon,
};

ipcMain.handle('getGlobal', (event, payload) => {
  const {attr, rest} = payload;
  if(typeof globalShare[attr] === 'function') 
    return globalShare[attr](...rest);
  else
    globalShare[attr];
});
globalShare.emitter.on('move', (event)=>{
  console.log(event);
});

async function createWindow() {
  globalShare.win = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    frame: false,
    backgroundColor: "#00000000",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
    }
  });
  //globalShare.win.setIgnoreMouseEvents(true);
  globalShare.win.webContents.openDevTools();

  globalShare.win.webContents.on('did-finish-load', () => {

    globalShare.ehwnd = globalShare.win.webContents.getOSProcessId();
    globalShare.hwnd = addon.GetForegroundWindow();
    let selectNewWindow = true;

    //window handlers  
    globalShare.win.on('blur', e => {
      if(selectNewWindow){
        let fhwnd = addon.GetForegroundWindow();
        if(fhwnd != 0 && fhwnd != globalShare.ehwnd){
          globalShare.hwnd = fhwnd;
          addon.SetWatchWindow(globalShare.hwnd);
        }
      }
      if(globalShare.hwnd)  selectNewWindow = false;
    });
    globalShare.win.on('focus', e => {
      showWindow();
      globalShare.win.webContents.send('focus', globalShare.hwnd);
    });
    globalShare.win.on('minimize', e => hideWindow());
    globalShare.win.on('restore', e => showWindow());
    
    globalShare.makeNewWindowSelectable = () => {
      selectNewWindow = true;
    }
  
    
    //helper functions
    function showWindow(){
      let rect;
      if(globalShare.hwnd){
        rect = addon.GetWindowRect(globalShare.hwnd);
      } else {
        rect = { left: 0, top: 0, right: 800, bottom: 600 };
      }
      globalShare.win.setPosition(rect.left, rect.top, false);
      globalShare.win.setSize(rect.right-rect.left, rect.bottom-rect.top, false);
      globalShare.win.show();
    }
    function hideWindow(){
      globalShare.win.minimize();
    }

    globalShare.appInspect = new appInspect(globalShare.ehwnd, globalShare.hwnd);
  });

  

  


  //devServer stuff
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    await globalShare.win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
  } else {
    createProtocol('app');
    globalShare.win.loadURL('app://./index.html');
  }
}



app.on('window-all-closed', () => process.platform !== 'darwin' ? app.quit() : null);
app.on('activate', () => BrowserWindow.getAllWindows().length === 0 ? createWindow() : null);
app.on('ready', async () => {
  app.allowRendererProcessReuse = false;
  if (isDevelopment && !process.env.IS_TEST) {
    try {
      await installExtension(VUEJS_DEVTOOLS); // Install Vue Devtools
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString());
    }
  }
  createWindow();
})

if (isDevelopment) {
  if (process.platform === 'win32')
    process.on('message', (data) => data === 'graceful-exit' ? app.quit() : null);
/*   else //no linux support
    process.on('SIGTERM', () => app.quit()); */
}