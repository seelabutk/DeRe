//Main Loom API (mode - contains instances)
function Loom(name, sources){
    this.name = name;
    this.sources = sources.constructor === 'Array' ? sources : [sources];
    this.instances = {};
}

Loom.prototype.addInstance = function(src){
    this.sources = this.sources.concat(src.constructor === 'Array' ? src : [src]);
}

//Instance api - contains videoCanvases

function LoomInstance(name){
    this.name = name;
    this.videoCanvases = [];
}

LoomInstance.prototype.newVideoCanvas = function(region){
    const videoCanvas = new LoomVideoCanvas(region, this)
    this.videoCanvases.push(videoCanvas);
    return videoCanvas;
}

//VideoCanvas api - contains videoCanvas

function loomVideoCanvas(region, instance){
    this.region = region;
    this.instance = instance;
}

loomVideoCanvas.prototype.newVideoCanvas = function(region){
    this.instance.newVideoCanvas(region);
}




function makeConfig(loom){
    const config = {};
    loom.instances.forEach(instance => {

    });
    return config;
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

const config = makeConfig(comboMode);
 */