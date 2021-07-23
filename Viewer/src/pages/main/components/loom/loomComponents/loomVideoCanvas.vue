<template>
  <div ref="container">

    <video 
      ref="videoPlayer" 
      class="video-js" 
      :style="{
        position: 'absolute',
        top: '0px',
        left: '0px',
        width:  currentConfig.window.width + 'px',
        height: currentConfig.window.height + 'px',
        visibility: 'hidden',
      }"
    />
    <!-- positioning of canvas, cutouts, components !-->
    <div
      :style="{
        position: 'absolute',
        width: width + 'px',
        height: height + 'px',
        top: top + 'px',
        left: left + 'px',
        outline: regionSelect && selected ? '1px dashed red' : regionSelect ? '1px dashed black' : 'none',
      }"
    >
      <!-- canvas element to redraw video !-->
      <canvas
        ref="canvas"
        style="width: 100%; height: 100%;"
        @mousedown="onVideoMouseDown"
        @mouseup="onVideoMouseUp"
        @click="dragging=false"
        @mousemove="onVideoMouseMove"
        @mouseleave="dragging=false"
      />

      <!-- black background cutouts !-->
      <div 
        v-for="(target, id) in targetData.cutouts"
        :key="id"
        :style="{
          position: 'absolute',
          top: target.start.y + 'px',
          left: target.start.x + 'px',
          width: (target.end.x - target.start.x) + 'px', 
          height: (target.end.y - target.start.y) + 'px',
          'background-color': 'black',
          'pointer-events': 'none',
        }"
      />
      <!-- drag selection !-->
      <div :style="dragSelectStyle"/>
      <!-- hints overlay !-->
      <div 
        class='overlay'
        :style='{display: overlay ? "block" : "none"}'
        style="position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5);"
      />
      <!-- relative positioning of components !-->
      <div
        class="offset"
        :style="{
          position: 'absolute',
          top: String(-otop) + 'px',
          left: String(-oleft) + 'px',
        }"
      >
        <!-- interactive loom objects !-->
        <component 
          v-for="target in currentTargets"
          :key="target.id" 
          :is="getComponent(target)" 
          :ref="'target' + target.id"
          :targetData="target"
          :showHint="$parent.hintHelpState"
          :interactable="!regionSelect"
          @change-state="changeState"
          @add-history="addHistory"
          @onmouseleave="DeleteHoverCanvas"
        />
      </div>
    </div>
    
  </div>
</template>

<script>

// TODO: get rid of $parent stuff, pass through events via loomVideoCanvas in loom.vue

import utils from './utils.js'
import polygonClipping from 'polygon-clipping'

import videojs from 'video.js'
import 'video.js/dist/video-js.min.css'

import loomConfig from '../loomConfig.json'
import loomBrushingBox from './loomBrushingBox.vue'
import loomButton from './loomButton.vue'
import loomTarget from './loomTarget.vue'
import loomHover from './loomHover.vue'
import loomDropdown from './loomDropdown.vue'

export default {
  name: 'loomVideoCanvas',
  emits: ['mousemove', 'frame_processed'],

  props: ['regionSelect', 'overlay', 'renderMode', 'currentConfig', 'start_state_id', 'dragMode', 'targetData'],
  components: {
    loomTarget,
    loomButton,
    loomHover,
    loomDropdown,
    loomBrushingBox,
  },

  data: function(){
    return {
      selected: false,
      dragStart: {x: 0, y: 0},
      dragCurr: {x: 0, y: 0},
      mouseLoc: {x: 0, y: 0},
      dragging: false,

      left: 0,
      top: 0,
      width: 0,
      height: 0,
      oleft: 0,
      otop: 0,
      xVideoRatio: 0,
      yVideoRatio: 0,
      ctx: null,
      current_state: Object.values(this.targetData.targets).find(t => t.id == this.start_state_id) || Object.values(this.targetData.targets)[1],
      hoverID: null,

      updateParentCurrentState: true,
      lastFrame: null,
      fps: 30,
    };
  },

  computed: {

    targets(){ return this.targetData.targets; },
    currentTargets(){ return utils.currentTargets(this.current_state, this.targetData.targets); },

    dragSelectStyle: function(){
      const top = Math.min(this.dragStart.y, this.dragCurr.y) + 'px';
      const left = Math.min(this.dragStart.x, this.dragCurr.x) + 'px';
      const width = Math.abs(this.dragCurr.x - this.dragStart.x) + 'px';
      const height = Math.abs(this.dragCurr.y - this.dragStart.y) + 'px';
      return {
        position: 'absolute',
        'display': this.regionExists ? 'block' : 'none',
        'background-color': 'rgba(0, 0, 0, 0.5)',
        'border-style': 'dashed',
        'pointer-events': 'none',
        top, left, width, height,
      };
    },

    regionExists(){
      if(
        this.dragStart.x == -10000 ||
        this.dragStart.y == -10000 ||
        this.dragCurr.x == -10000  ||
        this.dragCurr.y == -10000
      ) return false;
      if(
        Math.abs(this.dragCurr.x - this.dragStart.x) < 5 ||
        Math.abs(this.dragCurr.y - this.dragStart.y) < 5
      ) return false;
      if(this.dragMode || !this.regionSelect)  return false;
      return true;
    },
  },

  watch: {
    regionExists: function(v){
      this.emitter.emit('regionExists', {exists: v, origin: this});
    }
  },

  methods: {
    
    getComponent: function(target){
      if(target.name == 'root') return undefined;
      const loomObjectName = "loom" + target.actor.charAt(0).toUpperCase() + target.actor.slice(1);
      if(loomConfig[this.renderMode] && loomConfig[this.renderMode].mappings){
        const componentName = loomConfig[this.renderMode].mappings[loomObjectName];
        if(componentName && this.$options.components[componentName])
          return this.$options.components[componentName];
      }
      //defaults
      if(this.$options.components[loomObjectName])
        return this.$options.components[loomObjectName];
      return undefined;//loomTarget
    },

    setupVideo(element){
      let videoOptions = {
        sources: [{
          src: this.$parent.directory + '/' + this.$parent.video_filename,
          type: 'video/mp4',
        }],
        controls: false,
        loadingSpinner: false,
        controlBar: false,
      };
      return videojs(element, videoOptions, function() {  
        this.on("click", function(ev) {
            ev.preventDefault();
        });
      });
    },

    changeState(target, offset = 0, changeParent = true){
      this.changeStateWithFrameNo(target.frame_no, offset, changeParent);
    }, 

    changeStateWithFrameNo(frame, offset = 0, changeParent = true){
      if(changeParent && this.updateParentCurrentState) this.$parent.changeStateWithFrameNo(frame, offset);
      this.current_state = this.targetData.targets[frame];
      let img = null;
      //todo: check if is hover and needs additional videoCanvas' created to view full info
      if(this.current_state && this.current_state.actor == "hover"){
        img = cv.imread(this.$refs.canvas);
      }

      const actualFrame = frame + 1 + offset;
      if(this.lastFrame == actualFrame) return;

      this.player.currentTime(actualFrame/this.fps);
      this.lastFrame = actualFrame;

      if(img !== null){
        (new Promise(r => { // wait for frame change
          this.emitter.on('post_redraw' + this.targetData.id, r);
        })).then(() => {
          const newImg = cv.imread(this.$refs.canvas);
          const rect = this.compareImages(img, newImg);
          this.cutRegions(rect, false, false, true); // todo: error here
        });
      }
    },

    viewImageData(img, width, height){
      const canvas = document.createElement('canvas');
      document.body.appendChild(canvas);
      let imgData = new ImageData(new Uint8ClampedArray(img), width, height);
      let ctx = canvas.getContext('2d');
      canvas.style = `width: ${imgData.width}px; height: ${imgData.height}px; background-color: black; position: absolute; top: 0; left: 0;`;
      canvas.width = imgData.width;
      canvas.height = imgData.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(imgData, 0, 0);
    },

    viewImageCV(img){
      const canvas = document.createElement('canvas');
      document.body.appendChild(canvas);
      canvas.style = `width: ${img.cols}px; height: ${img.rows}px; background-color: black; position: absolute; top: 0; left: 0;`;
      canvas.width = img.cols;
      canvas.height = img.rows;
      cv.imshow(canvas, img)
    },

    compareImages(img1, img2){
      const src = cv.matFromArray(img1.rows, img1.cols, cv.CV_8UC3, utils.absdiff(img1, img2));
      cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
      cv.threshold(src, src, 50, 255, cv.THRESH_BINARY);
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(src, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      let rects = [];
      for(let i = 0; i < contours.size(); ++i)  rects.push(cv.boundingRect(contours.get(i)));
      
      function dist(p1, p2){
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      }
      rects = rects.filter(r => r.width * r.height > 500 && dist(r, this.mouseLoc) < 200) //filter out small regions      
        .sort((a, b) => dist(a, this.mouseLoc) - dist(b, this.mouseLoc));                 //sort by distance to mouse

      const rect = rects[0];
      return { left: rect.x, top: rect.y, right: rect.x + rect.width, bottom: rect.y + rect.height };
    },

    addHistory(t, e){ this.$parent.updateInteractionHistory(t, e, this.targetData.id); },

    cutSelectedRegion(){
      if(this.dragStart.x > this.dragCurr.x)  [this.dragStart.x, this.dragCurr.x] = [this.dragCurr.x, this.dragStart.x];
      if(this.dragStart.y > this.dragCurr.y)  [this.dragStart.y, this.dragCurr.y] = [this.dragCurr.y, this.dragStart.y];
      this.cutRegions({left: this.dragStart.x, top: this.dragStart.y, right: this.dragCurr.x, bottom: this.dragCurr.y});
      this.dragStart = this.dragCurr = {x: -10000, y: -10000};
    },

    cutRegions(regions, cutout = true, copyUI = true, hoverCutout = false){ 
      if(!this.targetData.parentCanvas){ // auto-new canvas - create new loomVideoCanvas component
        this.$parent.newVideoTarget({
          parentCanvas: this, 
          startupFn: c => {
            c.cutRegions(regions, cutout, copyUI, hoverCutout);
            c.emitter.emit('deselect');
            delete c.targetData.startupFn;
          },
          processed: true,
        });
        return;
      }

      if(regions.constructor !== Array) regions = [regions];
      regions.forEach(region => {

        const id = String(region.left) + '-' + String(region.top) + '-' + String(region.right) + '-' + String(region.bottom);
        const start = {x: region.left  + this.targetData.start.x, y: region.top    + this.targetData.start.y};
        const end   = {x: region.right + this.targetData.start.x, y: region.bottom + this.targetData.start.y};

        if(hoverCutout) this.hoverID = id;

        let targets = {};
        if(copyUI)  targets = this.cutCurrentRegionTargets({start, end});
        if(Object.keys(targets).length == 0) targets = {'1': this.targets[1]};

        this.$parent.videoTargets.push({
          id,
          top: this.top + region.top,
          left: this.left + region.left,
          start, end,
          parentCanvas: this,
          cutouts: [],
          targets,
          startupFn: c => {
            c.current_state = this.current_state;
            c.emitter.emit('deselect');
            if(hoverCutout) c.$refs.container.style.pointerEvents = 'none';
            delete c.targetData.startupFn;
          },
          processed: hoverCutout,
        });
        
        if(cutout) { //append cutout
          this.targetData.cutouts.push({
            start: {x: region.left, y: region.top},
            end: {x: region.right, y: region.bottom},
            id: this.targetData.id, 
          });
        }
      });
    },

    splitTarget(region, target){
      let target1 = utils.deepCopy(target);
      const poly1 = [[
        [region.start.x, region.start.y],
        [region.end.x  , region.start.y],
        [region.end.x  , region.end.y  ],
        [region.start.x, region.end.y  ],
        [region.start.x, region.start.y], //https://datatracker.ietf.org/doc/html/rfc7946 - "The first and last positions are equivalent, and they MUST contain identical values"
      ]];

      let target2 = utils.deepCopy(target);
      const poly2 = [target.shape.points.map( p => [p.x, p.y] )];

      let innerPolygon = polygonClipping.intersection(poly1, poly2)[0]; //todo: intersect all these into 1 poly
      let outerPolygon = polygonClipping.difference(poly2, poly1)[0];

      if(innerPolygon)  target1.shape.points = innerPolygon[0].map(p => ({x: p[0], y: p[1]}));
      else  target1 = null;
      
      if(outerPolygon)  target2.shape.points = outerPolygon[0].map(p => ({x: p[0], y: p[1]}));
      else target2.hide = true;
    
      return [target1, target2];
    },

    cutCurrentRegionTargets(region){
      let splitParent = {};
      let targets = {};
      let parents = {};

      Object.entries(this.targets).forEach(([key, target]) => {
        if(target.name == "root") return;
        const [split1, split2] = this.splitTarget(region, target)
        if(split1)  targets[key] = split1;
        if(split2)  splitParent[key] = split2;
      });

      Object.entries(splitParent).forEach(([key, split]) => this.targets[key] = split);

      Object.values(targets).forEach(target => {
        let parent = {...utils.findByName(target.parent, this.targets)}; //shallow copy
        if(!parents[parent.frame_no]){  //add parents
          if(typeof parent.frame_no == 'string' && parent.frame_no.includes('frameless')){
            //custom frameless html elements such as dropdown
            //todo: maybe resize?
            parent.children.forEach(c => {
              if(!parents[c.frame_no]) parents[c.frame_no] = c;
            });
          } else {
            parent.hide = true;
          } 
          parents[parent.frame_no] = parent;
        }
        const grandparent = utils.findByName(parent.parent, this.targets);
        if(grandparent){
          if(!parents[grandparent.frame_no]){ //add grandparent for future parent sibling traversal
            grandparent.hide = true;
            parents[grandparent.frame_no] = grandparent;
          }
          grandparent.children.forEach(sibling => { //add parent siblings
            if(!parents[sibling.frame_no]){
              sibling.hide = true;
              parents[sibling.frame_no] = sibling;
            }
          });
        }
      });
      targets = {...targets, ...parents};

      return targets;
    },

    onVideoMouseMove(e){
      this.mouseLoc = {x: e.offsetX, y: e.offsetY};
      if(!this.dragging)  return;
      this.dragCurr = {x: e.offsetX, y: e.offsetY};
      if(this.dragMode){
        this.top += e.movementY;
        this.left += e.movementX;
      }
    },

    onVideoMouseDown(e){
      if(!this.dragMode){
        this.dragCurr = this.dragStart = {x: e.offsetX, y: e.offsetY};
      }else{
        this.dragCurr = this.dragStart = {x: -10000, y: -10000};
      }
      this.emitter.emit('deselect');
      this.selected = true;
      this.$parent.currVideoCanvasSelected = this;
      this.dragging = this.regionSelect;
      return false;
    },

    onVideoMouseUp(e){
      this.dragging = false;
    },

    redraw(){
      this.xVideoRatio = this.$refs.videoPlayer.videoWidth/this.$refs.videoPlayer.clientWidth;
      this.yVideoRatio = this.$refs.videoPlayer.videoHeight/this.$refs.videoPlayer.clientHeight;
      this.ctx.drawImage(this.$refs.videoPlayer, this.oleft*this.xVideoRatio, this.otop*this.yVideoRatio, 
        this.width*this.xVideoRatio, this.height*this.yVideoRatio, 
        0, 0, this.width, this.height
      );
      this.emitter.emit('post_redraw' + this.targetData.id)
      this.processFrame();
    },

    processFrame(){
      if(this.targetData.processed) return;

      const src = cv.imread(this.$refs.canvas);
      
      cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
      cv.threshold(src, src, 254, 255, cv.THRESH_BINARY);
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(src, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
      
      //correct hierarchy data layout
      const arrs = [];
      const harr = Array.from(hierarchy.data32S);
      while(harr.length > 0) arrs.push(harr.splice(0, 4));

      //get top-level regions with children
      const regions = [];
      arrs.forEach((h, i) => { if(h[2] != -1 && h[3] == -1)  regions.push(i); });

      function isOverlapped(rect0, rect1){
        const r0 = {left: rect0.x, top: rect0.y, right: rect0.x + rect0.width, bottom: rect0.y + rect0.height};
        const r1 = {left: rect1.x, top: rect1.y, right: rect1.x + rect1.width, bottom: rect1.y + rect1.height};
        return !(r1.left > r0.right || r1.right < r0.left || r1.top > r0.bottom || r1.bottom < r0.top);
      }

      const rects = regions.filter(key => cv.contourArea(contours.get(parseInt(key)), false) > 1000)         // filter by area 
      .map(key => cv.boundingRect(contours.get(parseInt(key))))                                              // get bounding boxes
      .sort((a, b) => a.width * a.height > b.width * b.height)                                               //sort by area
      .filter((rect, i, rects) => !rects.slice(i+1).some((r)=>isOverlapped(r, rect)))                        // filter out overlapping rects
      .filter(rect => Math.abs(this.width - rect.width) > 100 && Math.abs(this.height - rect.height) > 100)  // filter out rects that try and crop too much of the screen out
      .map(rect => ({left: rect.x, top: rect.y, right: rect.x + rect.width, bottom: rect.y + rect.height}));
      
      this.cutRegions(rects);
  
      src.delete(); contours.delete(); hierarchy.delete();
      this.$emit('frame_processed');
    },

    DeleteHoverCanvas(){
      const idx = this.$parent.videoTargets.findIndex(vt => vt.id == this.hoverID);
      if(idx >= 0) this.$parent.videoTargets.splice(idx, 1);
    },
  },

  mounted(){
    if(this.targetData.startupFn) this.targetData.startupFn(this);
    if(this.targetData.start_state)  this.current_state = this.targetData.start_state;
    
    const self = this;    
    this.ctx = this.$refs.canvas.getContext('2d');

    this.width = this.targetData.end.x - this.targetData.start.x;
    this.height = this.targetData.end.y - this.targetData.start.y;

    this.$refs.canvas.width = this.width;
    this.$refs.canvas.height = this.height;
    
    this.oleft = this.targetData.start.x;
    this.otop = this.targetData.start.y;

    this.top =  this.targetData.top  != undefined ? this.targetData.top  : this.otop;
    this.left = this.targetData.left != undefined ? this.targetData.left : this.oleft;

    this.player = this.setupVideo(this.$refs.videoPlayer);
    this.player.ready(function(){
      this.on('timeupdate', () => self.redraw());
    });
    
    this.emitter.on('clearSelection', ()=>{
      this.dragging = false;
      this.dragStart = this.dragCurr = {x: -10000, y: -10000};
    });
    this.emitter.on('deselect', () => {
      this.selected = false;
    });
    this.emitter.on(`changeState-${this.targetData.id}`, this.changeState);

    this.selected = true;
    this.$parent.currVideoCanvasSelected = this;
    
    if(this.current_state) this.changeState(this.current_state, 0, false);
  },

  beforeUnmount(){
    //delete cutouts
    if(this.targetData.parentCanvas){
      const id = this.targetData.parentCanvas.targetData.cutouts.findIndex(c => c.id == this.targetData.id);
      if(id >= 0) this.targetData.parentCanvas.targetData.cutouts.splice(id, 1);
    }
    //save positions
    this.targetData.top = this.top;
    this.targetData.left = this.left;

    if (this.player) this.player.dispose();
  },
  
}
</script>

<style scoped>
</style>