//var addon = require('bindings')('addon');
const addon = require('../build/Release/addon');
const Jimp = require('jimp');

const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

async function main(){

    await sleep(2000);
    let hwnd = addon.GetForegroundWindow();
    let text = addon.GetWindowText(hwnd);
    let crect = addon.GetClientRect(hwnd);
    let wrect = addon.GetWindowRect(hwnd);
    let screenshot = addon.PrintWindow(hwnd);

    console.log("Window hwnd: ", hwnd);
    console.log("Window Title: ", text);
    console.log("Client rect: ", crect);
    console.log("Window rect: ", wrect);
    console.log("print window", screenshot);


    Jimp.read(screenshot).then(img => {
        img.write('./imgTest.bmp');
    });
}

main();