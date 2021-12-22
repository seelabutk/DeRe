//Main Loom API (mode - contains instances)

const fs = require('fs');

function Loom(names, fileLoc){
  if(fileLoc){
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
    });
  }
  if(names){
    if(!Array.isArray(names)) names = [names];
    names.forEach(name => {
      this.addInstance(name);
    });
  }
}

Loom.prototype.addInstance = function(name){
  this[name] = new LoomInstance();
  return this[name];
}

//Instance api - contains videoCanvases
function LoomInstance(){}

LoomInstance.prototype.newVideoCanvas = function (options) {
  const page = options.page ? String(options.page) : String(Object.keys(this).length - 1);
  this[page] = this[page] ? this[page] : {};
  options.id = options.id ? String(Object.keys(this[page]).length) : "0";


  const videoCanvas = new LoomVideoCanvas(options, this);
  this[page][options.id] = videoCanvas.data;
  return videoCanvas;
}

//VideoCanvas api - contains videoCanvas
function LoomVideoCanvas(options, instance) {
  this.instance = instance;
  this.data = {
    id: options.id,
    region: options.region,
    top: options.top || 0,
    left: options.left || 0,
    makeCutout: options.makeCutout || true,
    parentCanvas: options.parentCanvas || false
  }
}

LoomVideoCanvas.prototype.newVideoCanvas = function (options) {
  options.parentCanvas = this.data.id;
  this.instance.newVideoCanvas(options);
}

function main() {
  //example usage
  const comboMode = new Loom();
  const src1 = comboMode.addInstance('src1');

  const canvas1 = src1.newVideoCanvas({
    region: [[0,0],[0,1],[1,1],[1,0]],
  });
  
  const canvas2 = canvas1.newVideoCanvas({
    region: [[0.5,0.5],[0.5,1],[1,1],[1,0.5]],
  });

  console.log(JSON.stringify(comboMode));
}

if (require.main === module) {
  main();
}


