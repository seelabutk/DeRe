<template>
  <div ref="container" style="height: 0px; width: 0px;">

    <!-- positioning of canvas, cutouts, components !-->
    <div
      :style="{
        position: 'absolute',
        width: width + 'px',
        height: height + 'px',
        top: top + 'px',
        left: left + 'px',
        clipPath: `url(#clipping-${targetData.id})`,
      }"
    >
      <!-- canvas element to redraw video !-->
      <canvas
        ref="canvas"
        style="width: 100%; height: 100%;"
        @click="dragging=false"
        @mousedown="onVideoMouseDown"
        @mouseleave="dragging=false"
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
          top: '0px',
          left: '0px',
        }"
      >
        <!-- interactive loom objects !-->
        <component 
          v-for="target in currentTargets"
          :key="target.id" 
          :is="getComponent(target)" 
          :ref="'target' + target.id"
          :targetData="target"
          :showHint="overlay"
          :interactable="!regionSelect"
          :current_state="current_state"
          @change-state="changeState"
          @add-history="addHistory"
          @onmouseleave="DeleteHoverCanvas"
        />
      </div>
      <!-- cutouts to mask interaction regions !-->
      <svg 
        v-for="(cutout,id) in targetData.cutouts"
        :key="id"
        :width="width"
        :height="height"
        :style="{
          width: width,
          height: height,
          top: otop,
          left: oleft,
          position: 'absolute',
          fill: 'black',
        }"
        pointer-events='none'
      >
        <polygon pointer-events="fill" :points="cutout.poly"/>
      </svg>
    </div>

    <!-- videoCanvas polygon mask !-->
    <svg height="0" pointer-events="none">
      <clipPath :id="`clipping-${targetData.id}`">
        <polygon  pointer-events="fill" :points="currentPolygonMask ? currentPolygonMaskString : null"/>
      </clipPath>
    </svg>
    
  </div>
</template>

<script>

// TODO: get rid of $parent stuff, pass through events via loomVideoCanvas in loom.vue
// TODO: attempt to put all hoverCanvas logic into loomHover.vue?

// TODO: resizing, editing black cutout regions (moving, polygon, etc)

import utils from './utils.js'

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
  emits: ['frame_processed'],

  props: ['regionSelect', 'overlay', 'renderMode', 'dragMode', 'currentConfig', 'start_state_id', 'targetData', 'loomID'],
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
      resizePolygonMode: false,

      left: 0,
      top: 0,
      width: 0,
      height: 0,
      xVideoRatio: 0,
      yVideoRatio: 0,
      ctx: null,
      current_state: Object.values(this.targetData.targets).find(t => t.id == this.start_state_id) || Object.values(this.targetData.targets)[1],
      
      hoverMapping: {},
      polygonMasks: {},
      polygonResizeIdx: -1,

      updateParentCurrentState: true,
      lastFrame: null,
      fps: 30,
      throttle: false,
    };
  },

  computed: {
    targets(){ return this.targetData.targets; },
    currentTargets(){ return utils.currentTargets(this.current_state, this.targets); },
    currentPolygonMask(){ 
      let cs;
      for(cs = this.current_state; cs && !this.polygonMasks[cs.id]; cs = utils.findByName(cs.parent, this.targets))
      if(cs && this.polygonMasks[cs.id]){
        return this.polygonMasks[this.current_state.id];
      }
      return Object.values(this.polygonMasks)[0];
    },
    currentPolygonPath2D(){ return utils.polyToPath2D(this.currentPolygonMask,0,0); },
    currentPolygonMaskString(){ return utils.polyToPolyString(this.currentPolygonMask,0,0); },

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
      if(this.dragMode || !this.regionSelect)  return false;
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
      return true;
    },
  },

  watch: {
    regionExists: function(v){
      this.emitter.emit('regionExists', {exists: v, origin: this});
    },
    dragMode: function(v){
      this.redraw();
    },
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
      const p = videojs.getPlayer(element);
      if(p) return p;

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
      this.current_state = this.targets[frame];
      let img = null;

      if(this.current_state && this.current_state.actor == "hover" && !this.hoverMapping[this.current_state.id]){
        img = cv.imread(this.$refs.canvas);
        this.hoverMapping[this.current_state.id] = {};
      }

      const actualFrame = frame + 1 + offset;
      if(this.lastFrame == actualFrame) return;

      this.player.currentTime(actualFrame/this.fps);
      this.lastFrame = actualFrame;

      if(img !== null && !this.targetData.processed){
        (new Promise(r => { // wait for frame change
          this.emitter.on('post_redraw' + this.targetData.id, r);
        })).then(() => {
          if(!this.$refs.canvas)  return;
          let rect = null;

          if(!this.hoverMapping[this.current_state.rect]){
            const newImg = cv.imread(this.$refs.canvas);
            rect = this.compareImages(img, newImg);
            if(rect)  this.hoverMapping[this.current_state.id].rect = rect;
          } else {
            rect = this.hoverMapping[this.current_state.id].rect;
          }

          if(rect){
            rect = utils.rectToPoly(rect);
            this.cutRegions(rect, false, false, true);
          }
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
      if(rect) return { left: rect.x, top: rect.y, right: rect.x + rect.width, bottom: rect.y + rect.height };
      else return null;
    },

    addHistory(t, e){ this.$parent.updateInteractionHistory(t, e, this.targetData.id); },

    cutSelectedRegion(){
      if(this.dragStart.x > this.dragCurr.x)  [this.dragStart.x, this.dragCurr.x] = [this.dragCurr.x, this.dragStart.x];
      if(this.dragStart.y > this.dragCurr.y)  [this.dragStart.y, this.dragCurr.y] = [this.dragCurr.y, this.dragStart.y];
      const rect = utils.rectToPoly({
        x: this.dragStart.x,
        y: this.dragStart.y,
        width: this.dragCurr.x - this.dragStart.x, 
        height: this.dragCurr.y - this.dragStart.y
      });
      this.cutRegions(rect);
      this.dragStart = this.dragCurr = {x: -10000, y: -10000};
    },

    copyRegions(regions, copyUI = true, hoverCutout = false){ //not currently used
      this.cutRegions(regions, false, copyUI, hoverCutout);
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

      console.log()

      if(regions.length > 0 && regions[0].constructor !== Array) regions = [regions];
      regions.forEach((region, i) => {

        const id = String(this.targetData.id) + String(i);

        if(hoverCutout) {
          if(!this.hoverMapping[this.current_state.id]) this.hoverMapping[this.current_state.id] = {};
          this.hoverMapping[this.current_state.id].id = id;
        }

        this.$parent.videoTargets.push({
          id,
          region,
          top: this.top,
          left: this.left,
          makeCutout: cutout,
          parentCanvas: this,
          cutouts: [],
          targets: copyUI ? this.targets : [],
          startupFn: c => {
            c.current_state = this.current_state;
            c.emitter.emit('deselect');
            if(hoverCutout) c.$refs.container.style.pointerEvents = 'none';
            delete c.targetData.startupFn;
          },
          processed: true,
        });
      });
    },

    resizePolygon(e){
      const minD = 10;
      const c = this.polygonResizeIdx;
      const n = this.currentPolygonMask.length;
      const nidx = (c+1)%n;
      const pidx = ((c-1)%n+n)%n;
      if(utils.dist(this.currentPolygonMask[c], this.currentPolygonMask[nidx]) < minD 
      || utils.dist(this.currentPolygonMask[c], this.currentPolygonMask[pidx]) < minD){
        this.currentPolygonMask.splice(c, 1);
        this.resizePolygonMode = false;
        this.redraw(false);
        return;
      }
      this.currentPolygonMask[c] = e;

      if(!this.targetData.parentCanvas || !this.targetData.parentCanvas.targetData.cutouts)  return;
      const pcutouts = this.targetData.parentCanvas.targetData.cutouts;
      const cidx = pcutouts.findIndex(c => c.id == this.targetData.id);
      if(cidx >= 0){
        const newCutout = pcutouts[cidx];
        newCutout.poly = utils.polyToPolyString(this.currentPolygonMask, 0, 0);
        pcutouts.splice(cidx, 1, newCutout);
      }
      this.redraw(false);
    },

    addNewVertex(vertIdx, e){
      this.currentPolygonMask.splice(vertIdx+1, 0, e);
      this.resizePolygonMode = true;
      this.polygonResizeIdx = vertIdx+1;
      this.redraw(false);
    },

    isPolygonVertexHovered(e){
      if(!this.regionSelect) return -1;

      const thickness = 2;
      const boxSize = 8;
      const bs = Math.ceil(boxSize/2 + thickness/2);
      const paths = this.currentPolygonMask.map(pm => {
        let dx = 0, dy = 0;

        if(bs > pm.x) dx = -(pm.x-bs);
        else if(this.width < pm.x+bs) dx = this.width - (pm.x+bs);

        if(bs > pm.y) dy = -(pm.y-bs);
        else if(this.height < pm.y+bs) dy = this.height - (pm.y+bs);

        const square = [{x: pm.x+dx-bs, y: pm.y+dy-bs}, {x: pm.x+dx+bs, y: pm.y+dy-bs}, {x: pm.x+dx+bs, y: pm.y+dy+bs}, {x: pm.x+dx-bs, y: pm.y+dy+bs}];
        return utils.polyToPath2D(square);
      });
      return paths.findIndex(path => this.ctx.isPointInPath(path, e.x, e.y));
    },

    isPolygonLineHovered(e){
      if(!this.regionSelect) return -1;
      const lines = this.currentPolygonMask.map((pm, i, pms) => {
        const nidx = (i+1)%pms.length;
        const pn = pms[nidx];
        return utils.polyToPath2D([pm, pn]);
      });
      return lines.findIndex(line => this.ctx.isPointInStroke(line, e.x, e.y));
    },

    clientToOffset(e){
      const {left, top} = this.$refs.container.getBoundingClientRect();
      return {x: e.clientX - left - this.left, y: e.clientY - top - this.top};
    },
  
    onVideoMouseMove(e){
      this.mouseLoc = this.clientToOffset(e);
      
      if(this.resizePolygonMode){
        this.resizePolygon(this.mouseLoc);
        return;
      } else if(!this.dragMode) {
        if(this.isPolygonVertexHovered(this.mouseLoc) >= 0){
          document.body.style.cursor = 'move';
        } else if(this.isPolygonLineHovered(this.mouseLoc) >= 0) {
          document.body.style.cursor = 'crosshair';
        }
      }

      if(!this.selected)  return;
      if(!this.dragging)  return;
      this.dragCurr = this.mouseLoc;
      if(this.dragMode){
        this.top += e.movementY;
        this.left += e.movementX;
      }
    },

    onVideoMouseDown(e){
      document.body.style.cursor = 'default';
      this.selected = true;
      this.mouseLoc = this.clientToOffset(e);
      
      const resizePoly = this.isPolygonVertexHovered(this.mouseLoc);
      if(resizePoly >= 0){
        this.resizePolygonMode = true;
        this.polygonResizeIdx = resizePoly;
      }

      const newVertex = this.isPolygonLineHovered(this.mouseLoc);
      if(newVertex >= 0 && resizePoly < 0){  
        this.addNewVertex(newVertex, this.mouseLoc);
        this.redraw(false);
      }

      if(!this.dragMode){
        this.dragCurr = this.dragStart = this.mouseLoc;
      }else{
        this.dragCurr = this.dragStart = {x: -10000, y: -10000};
      }
      this.emitter.emit('deselect');
      this.selected = true;
      this.emitter.emit("selectVideoCanvas", this);
      this.dragging = this.regionSelect;
      return false;
    },

    onVideoMouseUp(e){
      this.dragging = false;
      this.selected = false;
      this.resizePolygonMode = false;
      document.body.style.cursor = 'default';
    },

    drawPolyOutline(ctx, poly){
      const color = '#ff0000';
      const thickness = 2;
      const boxSize = 8;
      ctx.lineWidth = thickness;
      ctx.strokeStyle = color;

      let square = (function(xp, yp){
        const bs = Math.ceil(boxSize/2 + thickness/2);
        ctx.strokeRect(utils.bound(xp, bs, this.width-bs)-bs, utils.bound(yp, bs, this.height-bs)-bs, boxSize, boxSize);
      }).bind(this);

      ctx.beginPath();
      ctx.moveTo(utils.bound(poly[0].x, thickness/2, this.width-thickness/2), utils.bound(poly[0].y, thickness/2, this.height-thickness/2));
      for(let i = 1; i < poly.length; ++i){
        ctx.lineTo(utils.bound(poly[i].x, thickness/2, this.width-thickness/2), utils.bound(poly[i].y, thickness/2, this.height-thickness/2));
      }
      ctx.closePath();
      ctx.stroke();
      poly.forEach(p => square(p.x, p.y));
      
    },

    redraw(emit = true){
      if(this.throttle) return;
    
      this.xVideoRatio = this.videoPlayer.videoWidth/this.videoPlayer.clientWidth;
      this.yVideoRatio = this.videoPlayer.videoHeight/this.videoPlayer.clientHeight;
      this.ctx.restore();
      this.ctx.save();
      this.ctx.fillStyle = "rgba(0, 0, 0, 0)";
      this.ctx.clearRect(0, 0, this.width, this.height);

      if(this.currentPolygonMask){
        this.ctx.clip(this.currentPolygonPath2D);
      }
      this.ctx.drawImage(this.videoPlayer, 0, 0, 
        this.width*this.xVideoRatio, this.height*this.yVideoRatio, 
        0, 0, this.width, this.height
      );
      if(!this.dragMode && this.currentPolygonMask){
        this.drawPolyOutline(this.ctx, this.currentPolygonMask);
      }
      
      if(emit) this.emitter.emit('post_redraw' + this.targetData.id)
      this.processFrame();
  
      this.throttle = true;
      setTimeout(() => this.throttle=false, 20);
    },

    processFrame(){
      if(this.targetData.processed || !this.$refs.canvas) return;

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
      .map(utils.rectToPoly);

      this.cutRegions(rects, true, true, false);
  
      src.delete(); contours.delete(); hierarchy.delete();
      this.$emit('frame_processed');
    },

    DeleteHoverCanvas(){
      const idx = this.$parent.videoTargets.findIndex(vt => vt.id == this.hoverMapping[this.current_state.id].id);
      if(idx >= 0) this.$parent.videoTargets.splice(idx, 1);
    },

    clearSelection(){
      this.dragging = false;
      this.dragStart = this.dragCurr = {x: -10000, y: -10000};
    },
    deselect(){
      this.selected = false;
    },
  },

  mounted(){
    if(this.targetData.start_state)  this.current_state = this.targetData.start_state;
    
    const self = this;    
    this.ctx = this.$refs.canvas.getContext('2d');
    this.ctx.save();

    this.width = this.currentConfig.window.width;
    this.height = this.currentConfig.window.height;

    this.$refs.canvas.width = this.width;
    this.$refs.canvas.height = this.height;
    
    this.id = this.targetData.id

    this.top =  this.targetData.top || 0;
    this.left = this.targetData.left || 0;

    this.otop = this.top;
    this.oleft = this.left;

    if(!this.targetData.videoPlayerLink){
      this.targetData.videoPlayerLink = this.targetData.id;
      this.$parent.createNewVideoPlayer(this.targetData.videoPlayerLink);
    }
    
    //nextTick ensures the videoTarget reference will be created by the time this code runs
    this.$nextTick(()=>{
      
      this.videoPlayer = this.$parent.$refs[`videoPlayer${this.targetData.videoPlayerLink}`];
      if(!this.videoPlayer){
        console.error("Error, videoPlayer not yet created!");
      }

      this.player = this.setupVideo(this.videoPlayer);
      this.player.ready(function(){
        this.on('timeupdate', () => self.redraw());
      });
      
      if(this.current_state){
        this.changeState(this.current_state, 0, false);
        if(this.targetData.region){
          this.polygonMasks[this.current_state.id] = this.targetData.region;
        } else {
          this.polygonMasks[this.current_state.id] = [
            {x: 0, y: 0},
            {x: this.width, y: 0},
            {x: this.width, y: this.height},
            {x: 0, y: this.height}
          ];
        }
        if(this.targetData.makeCutout && this.targetData.parentCanvas){
          const region = this.polygonMasks[this.current_state.id];
          const minX = Math.min(...region.map(p => p.x));
          const maxX = Math.max(...region.map(p => p.x));
          const minY = Math.min(...region.map(p => p.y));
          const maxY = Math.max(...region.map(p => p.y));
          const pcutouts = this.targetData.parentCanvas.targetData.cutouts;
          pcutouts.push({
            poly: utils.polyToPolyString(this.currentPolygonMask, 0, 0),
            width: maxX-minX,
            height: maxY-minY,
            top: minY,
            left: minX,
            id: this.targetData.id,
          });
          this.redraw(false);
        }
      } else {
        console.warn("No Current State!");
      }
      
      if(this.targetData.startupFn) this.targetData.startupFn(this);
      
      this.emitter.on('clearSelection', this.clearSelection);
      this.emitter.on('deselect', this.deselect);
      this.emitter.on(`changeState-${this.targetData.id}`, this.changeState);
      this.emitter.on('mousemove', this.onVideoMouseMove);
      this.emitter.on('mouseup', this.onVideoMouseUp);

      this.selected = true;
      this.emitter.emit("selectVideoCanvas", this);
    });
  },

  beforeUnmount(){
    //delete cutouts
    if(this.targetData.parentCanvas && this.targetData.parentCanvas.targetData){
      const id = this.targetData.parentCanvas.targetData.cutouts.findIndex(c => c.id == this.targetData.id);
      if(id >= 0) this.targetData.parentCanvas.targetData.cutouts.splice(id, 1);
    }
    //save positions
    this.targetData.top = this.top;
    this.targetData.left = this.left;

    //delete event listeners
    this.emitter.off('clearSelection', this.clearSelection);
    this.emitter.off('deselect', this.deselect);
    this.emitter.off(`changeState-${this.targetData.id}`, this.changeState);
    this.emitter.off('mousemove', this.onVideoMouseMove);
    this.emitter.off('mouseup', this.onVideoMouseUp);
  },
  
}
</script>

<style scoped>
</style>