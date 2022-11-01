const fs = require('fs');

function makeDeReObject(dere){
  if(!dere.data['startState'])
    dere.addStartState();
  const obj = {};
  function recurse(obj, dobj){
    for (const [dkey, dval] of Object.entries(dobj)){
      if(dkey === 'hidden' || dkey === 'startState'){
        obj[dkey] = dval;
      } else if(typeof dval === 'object' && dval !== null && dval.data !== undefined){
        obj[dkey] = dval.data;
        recurse(obj[dkey], dval.data);
      }
    }
  }
  recurse(obj, dere.data);
  return obj;
}

function DeRe(instances = {}){
  this.data = {};
  this.type = 'DeRe'
 
  if(typeof instances === 'string'){
    const fileLoc = instances;
    const data = JSON.parse(fs.readFileSync(fileLoc, 'utf8'));
    return new DeRe(data);
  }else if(Array.isArray(instances)){
    instances.forEach(instance => {
      this.addInstance(instance);
    });
  }else if(typeof instances === 'object'){
    for(const [name, data] of Object.entries(instances)){
      if(name == 'startState')
        this.addStartState(data);
      else
        this.addInstance(name, data);
    }
  }
  if(!('hidden' in this.data)){
    this.data['hidden'] = {};
  }
}

DeRe.prototype.addStartState = function(data={}){
  if(!data.appMode){
    data.appMode = Object.values(this.data).map(data => data.modelessName).filter(key => key && key != 'hidden')
  }
  if(!data.current_state){
    data.current_state = 1;
  }
  this.data['startState'] = data;
}


DeRe.prototype.getInstance = function(name){
  return this.data[name];
}

DeRe.prototype.addInstance = function(name, canvases=[], mode='desktop'){
  let ret;
  if(name instanceof DeReInstance){
    const instance = name;
    this.data[instance.name] = instance;
    ret = this.data[instance.name];
  } else {
    ret = new DeReInstance(name, canvases, mode, this);
  }
  return ret;
}

DeRe.prototype.objectify = function() {
  return makeDeReObject(this);
}

DeRe.prototype.save = function(filepath) {
  if(!('startState' in this.data)){
    this.addStartState({saveName: filepath,});
  }
  data = JSON.stringify(this.objectify());
  fs.writeFile(filepath, data, {flag: 'w+'}, err => {})
}

DeRe.prototype.getInstance = function(instanceName){
  return this.data[instanceName];
}

//Instance api - contains videoCanvases
function DeReInstance(name, canvases=[], mode='desktop', manager){
  this.manager = manager;
  this.modelessName = name
  this.name = name + '_'  + mode;
  this.type = 'Instance'
  this.manager.data[this.name] = this;
  this.data = {};

  let setupDefault = false;
  if(!Array.isArray(canvases) && typeof canvases === 'object'){
    if(Object.keys(canvases).length == 0){
      setupDefault = true;
    }else{
      for(const page of Object.values(canvases)){
        for(const canvas of Object.values(page)){
          this.newVideoCanvas(canvas);
        }
      }
    }
    
  }else{
    if(canvases.length == 0){
      setupDefault = true;
    }else{
      for(const canvas of canvases){
        this.newVideoCanvas(canvas);
      }
    }
  }
  if(setupDefault){
    this.setupDefault();
  }

  
}

DeReInstance.prototype.newPage = function(options){
  if(!(options.page in this.data)){
    this.data[options.page] = new DeRePage(options);
  }else{
    createNewDeReVideoCanvasObj(options, this.data[options.page]);
  }
  return this.data[options.page];
}


DeReInstance.prototype.newVideoCanvas = function(options={}) {
  if(!options.region){
    options.region = [[0,0],[0,1],[1,1],[1,0]];
  }
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

DeReInstance.prototype.setupDefault = function(){
  this.newVideoCanvas()
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
    region: options.region.map(xy => ({x: xy[0], y: xy[1]})),
    top: options.top !== undefined ? options.top : 0,
    left: options.left !== undefined ? options.left : 0,
    cutouts: options.cutouts !== undefined ? options.cutouts : [],
    makeCutout: options.makeCutout !== undefined ? options.makeCutout : false,
    parentCanvas: options.parentCavasId !== undefined ? options.parentCanvasId : false,
    current_state_id: options.current_state_id !== undefined ? options.current_state_id : 1,
    linkedFrames: options.linkedFrames !== undefined ? options.linkedFrames : undefined,
    processed: options.processed !== undefined ? options.processed : true,
    startupFn: options.startupFn !== undefined ? options.startupFn : null,
  }

  for(const key in this.data){
    if(this.data[key] === undefined)
      delete this.data[key];
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

  if(frames2 !== undefined){
    frames1 = frames1.map((_,i) => ([frames1[i], frames2[i]]));
  }
  
  this.data.linkedFrames.push({
    instance: vc2.instance.modelessName,
    page: vc2.page,
    vcid: vc2.id,
    frames: frames1,
  });
}

module.exports = {
  DeReVideoCanvas,
  DeRePage,
  DeReInstance,
  DeRe,
  makeDeReObject
}

function mainScratch() {

  //example usage - from scratch
  const nestedVideoCanvas = new DeReVideoCanvas({
    region: [[0.25,0.25],[0.25,1],[1,1],[1,0.25]],
  });

  const dere = new DeRe({
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

  dere.addInstance(instance2);

  nestedVideoCanvas.frameLink(instance2.getPage(-1).getVideoCanvas(0), 1, 2);

  dere.save('./dere_modified.json');

}

function mainFile(){
  //example useage - from file
  const dere = new DeRe();
  const app1 = new DeReInstance('instance_name_1');
  const app2 = new DeReInstance('instance_name_2');

  dere.addInstance(app1)
  dere.addInstance(app2);
  
  const vc0 = app1.getPage(-1).getVideoCanvas(0);
  const vc1 = app2.getPage(-1).getVideoCanvas(0);

  const frameLinks = [[0,0], [1,3], [5,5]];
  frameLinks.forEach(frameLink => {
    vc0.frameLink(vc1, ...frameLink)
  });

  console.log(JSON.stringify(dere.objectify()))
  //dere.save('./dere_modified.json')

}

function gen_fig_4_2(){
  const dere = new DeRe();
  const app1 = dere.addInstance('median_household_income_2018', [{
    region: [[0,0],[843,0],[843,801],[0,801]],
    makeCutout: false,
    top: 77,
    left: -380,
  }]);
  const app2 = dere.addInstance('median_household_income_2019', [{
    region: [[0,0],[816,0],[816,805],[0,805]],
    makeCutout: false,
    top: 77,
    left: 449,
  }]);

  let allFrames = [...Array(46).keys()].map(i => i + 2);
  let skipFrames = new Set([30, 41, 42]);
  let frames = allFrames.filter(i => !skipFrames.has(i));

  const vc0 = app1.getPage(-1).getVideoCanvas(0);
  const vc1 = app2.getPage(-1).getVideoCanvas(0);

  vc0.frameLink(vc1, frames, frames);

  dere.save('./dere_modified.json')

  //console.log(JSON.stringify(dere.objectify()))

}

if (require.main === module) {
  //mainFile();
  //mainScratch();
  gen_fig_4_2();
}


