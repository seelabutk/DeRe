//Main Loom API (mode - contains instances)

const fs = require('fs')

function Loom(name, fileLoc) {
  fs.readFile(fileLoc, 'utf8', (err, datatxt) => {
    if(err){
      console.error(err);
      return;
    }
    let data;
    try {
      data = JSON.parse(datatxt);
    } catch(err){
      console.log(err);
      return;
    }

    Object.entries(data, ([key, val]) => {
      this[key] = val;
    });
    
  })
}

Loom.prototype.addInstance = function (name, loomInstance={}) {
  this[name] = loomInstance;
}

//Instance api - contains videoCanvases

function LoomInstance() {

}

LoomInstance.prototype.newVideoCanvas = function (region) {
  const videoCanvas = new LoomVideoCanvas(region, this)
  this.videoCanvases.push(videoCanvas);
  return videoCanvas;
}

//VideoCanvas api - contains videoCanvas

function loomVideoCanvas(region, instance) {
  this.region = region;
  this.instance = instance;
}

loomVideoCanvas.prototype.newVideoCanvas = function (region) {
  this.instance.newVideoCanvas(region);
}



//example usage

//require api.js
/*
const comboMode = new Loom('modeName', ['src1', 'src2']);
comboMode.addInstance('src3');

const src1 = comboMode.instances['src1'];
const region = [[0,0],[0,1],[1,1],[1,0]];

const src1Canvas1 = src1.newVideoCanvas(region);
const src1Canvas2 = src1Canvas1.newVideoCanvas(region);
 */