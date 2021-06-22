'use strict';

const addon = __non_webpack_require__('../../addon/main');
const cv = require('opencv4nodejs');

class AppInspector {
  constructor(overlay_hwnd, hwnd) {
    this.overlay_hwnd = overlay_hwnd;
    this.hwnd = hwnd;
    addon.init(this.overlay_hwnd, this.hwnd);
    this.screenshots = [];
    this.maxScreenshotHistory = 2;
  }

  appendScreenshot(shot) {
    this.screenshots.unshift(shot);
    if (this.screenshots.length > this.maxScreenshotHistory) this.screenshots.pop();
  }

  getWindowLoc() {
    const rect = addon.GetWindowRect(this.hwnd)
    return {
      x: rect['left'],
      y: rect['top'],
      w: rect['right'] - rect['left'],
      h: rect['bottom'] - rect['top'],
    }
  }

  async screenshot() {
    let buffer = addon.PrintWindow(this.hwnd);
    let img = new cv.Mat(buffer.data, buffer.height, buffer.width, cv.CV_8UC4);
    this.appendScreenshot(img);
  }

  findContours(img){
    let cimg = img.cvtColor(cv.COLOR_BGR2GRAY);
    //no thresholding required, we're doing a pixel-by-pixel comparison
    //cimg = cimg.threshold(0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU); 
    const cnts = cimg.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE).sort((c0, c1) => c1.area - c0.area); //largest first
    let mask = new cv.Mat(cimg.rows, cimg.cols, cv.CV_8UC1, 0);

    const regions = [];
    cnts.forEach(c => {
      const rect = c.boundingRect();
      if(rect.length == 0)  return;
      
      regions.push(rect);
      mask.drawRectangle(
        rect,
        new cv.Vec(255, 255, 255),
        -1,
        cv.LINE_8
      );
    });

    const thresholdX = 3;
    const thresholdY = 3;

    //connect nearby regions
    const data = mask.getDataAsArray();
    for(let y = 0; y < data.length; ++y){
      for(let x = 0; x < data[y].length; ++x){
        if(data[y][x] == 255){
          if(data[y][x+thresholdX] == 255)
            for(let k = 0; k < thresholdX; ++k)
              data[y][x+k] = 255;
          if(data[y+thresholdY][x] == 255)
            for(let k = 0; k < thresholdY; ++k)
              data[y+k][x] = 255;
        }
      }
    }
    mask = new cv.Mat(data, cv.CV_8UC1);
    const cnts2 = mask.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    return {contours: cnts2, regions};
  }

  compareScreenshots() {
    const shot1 = this.screenshots[0];
    const shot2 = this.screenshots[1];
    const diff = shot1.absdiff(shot2);
    const {contours, regions} = this.findContours(diff);

    const debugDraw = true;
    if(debugDraw){
      contours.forEach(contour => {
        const edgePoints = contour.getPoints();
        shot1.drawContours([edgePoints], -1, new cv.Vec3(255, 0, 0), { thickness: 2 });
      });
      cv.imwriteAsync('./output.bmp', shot1);
    }

    return {contours, regions};
  }
}

module.exports = AppInspector;