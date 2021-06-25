'use strict'

import { app, protocol, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import path from 'path'
//import fs from 'fs'
import { EventEmitter } from 'events'
import os from 'os'

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
  setInteractable: null,
  setOverlayState: null,
  updateOverlayState: null,
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
    },
    fullscreenable: false,
    //skipTaskbar: true,
    resizable: true,
    //show: false,
  });
  
  

  globalShare.win.webContents.on('did-finish-load', () => {
    //globalShare.win.webContents.openDevTools();
    //setup handles
    const hbuf = globalShare.win.getNativeWindowHandle();
    globalShare.ehwnd = os.endianness == "LE" ? hbuf.readInt32LE() : hbuf.readInt32BE();
    globalShare.hwnd = addon.GetForegroundWindow();

    //init addon/appInspect
    addon.init(globalShare.ehwnd, globalShare.hwnd, function(e){
      const callbackHandles = ['focus', 'unminimize', 'move', 'nameChange', 'destroy'];
      const type = callbackHandles[e['type']];
      if(type)  delete e['type'];
      globalShare.emitter.emit(type, e);
    }.bind(this));
    globalShare.appInspect = new appInspect(globalShare.ehwnd, globalShare.hwnd);

    //local variables
    let overlayState = false;
    let interactable = false;
    let selectNewWindow = true;
    
    //helper functions
    function updateOverlay(){
      if(overlayState){
        globalShare.win.setIgnoreMouseEvents(!interactable);
        globalShare.win.show();
        addon.SetForegroundWindow(globalShare.ehwnd);
      }else{
        globalShare.win.minimize();
        globalShare.win.setIgnoreMouseEvents(true);
        addon.SetForegroundWindow(globalShare.hwnd);
      }
    }
    updateOverlay();

    globalShortcut.register('CmdOrCtrl + H', () => { 
      overlayState = !overlayState; 
      if(!overlayState)  interactable = false;
      updateOverlay(); 
    });
    globalShortcut.register('CmdOrCtrl + I', () => {
      interactable = !interactable; 
      if(interactable) overlayState = true; 
      updateOverlay(); 
    })


    //globalShare functions
    globalShare.makeNewWindowSelectable = () => {
      selectNewWindow = true;
    };
    globalShare.setInteractable = e => {
      if(e) interactable = e;
      return interactable;
    };
    globalShare.setOverlayState = e => {
      if(e) overlayState = e;
      return overlayState;
    };
    globalShare.updateOverlay = () => updateOverlay();


    //emmitter callbacks
    globalShare.emitter.on("focus", (e) => {
      if(e.hwnd == globalShare.ehwnd){
        globalShare.win.webContents.send('focus', globalShare.hwnd);
      } else if(selectNewWindow && e.hwnd != 0){
        globalShare.hwnd = e.hwnd;
        addon.SetWatchWindow(globalShare.hwnd);
        const rect = addon.GetClientWindowRect(globalShare.hwnd);
        globalShare.win.setBounds({x: rect.left, y: rect.top, width: rect.right-rect.left, height: rect.bottom-rect.top});
        selectNewWindow = false;
      }
    });
    globalShare.emitter.on("move", (e) => {
      globalShare.win.setBounds({x: e.x, y: e.y, width: e.w, height: e.h});
      addon.SetForegroundWindow(ehwnd);
    });

    
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