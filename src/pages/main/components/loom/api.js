const fs = require('fs');

function makeDeReObject(dere){
  const obj = {};
  function recurse(obj, dobj){
    for (const [dkey, dval] of Object.entries(dobj)){
      if(typeof dval === 'object' && dval.data !== undefined){
        obj[dkey] = dval.data;
        recurse(obj[dkey], dval.data);
      }
    }
  }
  recurse(obj, dere.data);
  return obj;
}

function DeRe(instances, fileLoc=null){
  this.data = {};
  this.type = 'DeRe'
 
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
  if(instances){
    for(const [name, canvas] of Object.entries(instances)){
      this.addInstance(name, canvas);
    }
  }
}

DeRe.prototype.addInstance = function(name, canvases){
  if(name instanceof DeReInstance){
    const instance = name;
    this.data[instance.name] = instance;
  } else {
    this.data[name] = new DeReInstance(name, canvases);
  }
  
  return this.data[name];
}

DeRe.prototype.objectify = function() {
  return makeDeReObject(this);
}

DeRe.prototype.save = function(filepath) {
  data = JSON.stringify(this.objectify());
  fs.writeFile(filepath, data, {flag: 'w+'})
}

DeRe.prototype.getInstance = function(instanceName){
  return this.data[instanceName];
}

//Instance api - contains videoCanvases
function DeReInstance(name, canvases){
  this.name = name;
  this.type = 'Instance'
  this.data = {};

  for(const canvas of canvases){
    this.newVideoCanvas(canvas);
  }
}

DeReInstance.prototype.newPage = function(options){
  if(!(options.page in this.data)){
    this.data[options.page] = new DeRePage(options);
  }else{
    this.data[options.page] = createNewDeReVideoCanvasObj(options);
  }
  return this.data[options.page];
}


DeReInstance.prototype.newVideoCanvas = function(options) {
  options.instance = this;
  options.page = options.page ? String(options.page) : String(Object.keys(this.data).length - 1);
  return this.newPage(options).data[options.id];
}

DeReInstance.prototype.frameLink = function(vc1, frames1, vc2, frames2){
  vc1.frameLink(vc2, frames1, frames2);
}

DeReInstance.prototype.getPage = function(pageNo){
  return this.data[pageNo];
}

function DeRePage(options){
  this.data = {};
  if(options['id'] === undefined)
    options.id = '0';
  
  const vc = createNewDeReVideoCanvasObj(options, this);
  if(vc)  this.data = vc;

  this.instance = options.instance;
  this.page = options.page;
}

DeRePage.prototype.newVideoCanvas = function(videoCanvas){
  return createNewDeReVideoCanvasObj(videoCanvas, this);
}

DeRePage.prototype.getVideoCanvas = function(videoCanvasID){
  return this.data[videoCanvasID];
}

function createNewDeReVideoCanvasObj(options, pageObj){
  if(options instanceof DeReVideoCanvas){
    options.instantiate(options, pageObj);
  }else if(typeof options === 'object'){
    new DeReVideoCanvas(options, pageObj);
  }
}

//VideoCanvas api - contains videoCanvas
function DeReVideoCanvas(options, pageObj) {
  this.instantiate(options, pageObj);
}

DeReVideoCanvas.prototype.instantiate = function(options, pageObj){
  this.instance = options.instance;
  this.type = 'VideoCanvas'
  this.pageObj = pageObj;
  this.page = options.page;
  this.id = options.id;
  this.data = {
    id: options.id,
    page: options.page,
    region: options.region,
    top: options.top || 0,
    left: options.left || 0,
    cutouts: options.cutouts || [],
    makeCutout: options.makeCutout || true,
    parentCanvas: options.parentCanvasId || false,
    ...options.data,
  }
  
  if(this.pageObj)
    this.pageObj.data[this.id] = this;

  if(options.canvases)
    options.canvases.forEach(this.newVideoCanvas.bind(this));
}

DeReVideoCanvas.prototype.newVideoCanvas = function (canvasOptions) {
  canvasOptions.parentCanvas = this.data;
  canvasOptions.parentCanvasId = this.data.id;

  if(canvasOptions['page'] === undefined)
    canvasOptions.page = this.page;
  if(canvasOptions['id'] === undefined)
    canvasOptions.id = String(Object.keys(this.pageObj.data).length);

  canvasOptions.instance = this.instance;
  canvasOptions.page = this.page;
  createNewDeReVideoCanvasObj(canvasOptions, this.pageObj);
}

DeReVideoCanvas.prototype.frameLink = function(vc2, frames1, frames2){
  if(this.data['linkedFrames'] === undefined)
    this.data.linkedFrames = [];
  if(!Array.isArray(frames1))
    frames1 = [frames1];
  if(!Array.isArray(frames2))
    frames2 = [frames2];

  if(frames1.length != frames2.length)  return;

  for(let i = 0; i < frames1.length; ++i){
    const f1 = frames1[i];
    const f2 = frames2[i];
    this.data.linkedFrames.push({
      instance: vc2.instance.name,
      page: vc2.page,
      vcid: vc2.id,
      frames: [f1,f2],
    });
  }
}

function main() {

  //example usage

  const nestedVideoCanvas = new DeReVideoCanvas({
    region: [[0.25,0.25],[0.25,1],[1,1],[1,0.25]],
  });
  const comboMode = new DeRe({
    'src1': [{
      region: [[0,0],[0,1],[1,1],[1,0]],
      canvases: [{
        region: [[0.5,0.5],[0.5,1],[1,1],[1,0.5]],
        canvases: [
          nestedVideoCanvas,
        ],
      }],
    },
  ]});

  const instance2 = new DeReInstance('src2', [{
    region: [[0,0],[0,0.5],[0.5,0.5],[0.5,0]],
  }]);
  comboMode.addInstance(instance2);

  nestedVideoCanvas.frameLink(instance2.getPage(-1).getVideoCanvas(0), 1, 2)

  console.log(JSON.stringify(comboMode.objectify()));
}

if (require.main === module) {
  main();
}


