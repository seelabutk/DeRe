<template>
  <div ref="container" style="height: 0px; width: 0px; pointer-events: auto;">

    <!-- positioning of canvas, cutouts, components !-->
    <div
      :style="{
        position: 'absolute',
        width: width + 'px',
        height: height + 'px',
        top: top + 'px',
        left: left + 'px',
        clipPath: `url(#clipping-${instanceID}-${id})`,
      }"
      @click=" dragging=false; emitter.emit('clickVideoCanvas'); "
      @mousedown="onVideoMouseDown"
      @mouseleave="dragging=false"
    >
      <!-- canvas element to redraw video !-->
      <div>
        <canvas
          ref="canvas"
          style="width: 100%; height: 100%;"
        />
        <!-- drag selection !-->
        <div :style="dragSelectStyle"/>
        <!-- hints overlay !-->
        <div 
          class='overlay'
          :style='{display: overlay ? "block" : "none"}'
          style="position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5);"
        />
      </div>

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
          :targets="targets"
          :showHint="overlay"
          :interactable="!regionSelect"
          @change-state="changeState"
          @add-history="addHistory"
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
          top: '0px',
          left: '0px',
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
      <clipPath :id="`clipping-${instanceID}-${targetData.id}`">
        <polygon  pointer-events="fill" :points="currentPolygonMask ? currentPolygonMaskString : null"/>
      </clipPath>
    </svg>
    
  </div>
</template>

<script>

// TODO: get rid of $parent stuff, pass through events via loomVideoCanvas in loom.vue
// TODO: resizing, editing black cutout regions (moving, polygon, etc)

import utils from './utils/utils.js'

import loomConfig from './loomConfig.json'
import loomBrushingBox from './loomComponents/loomBrushingBox.vue'
import loomButton from './loomComponents/loomButton.vue'
import loomHover from './loomComponents/loomHover.vue'
import loomDropdown from './loomComponents/loomDropdown.vue'
import loomUSA from './loomComponents/loomUSA.vue'

export default {
  name: 'loomVideoCanvas',
  emits: ['frame_processed'],

  props: ['regionSelect', 'overlay', 'renderMode', 'renderAppMode', 'dragMode', 'info', 'targets', 'targetData', 'instanceID', 'start_state_id'],
  components: {
    loomButton,
    loomHover,
    loomDropdown,
    loomBrushingBox,
    loomUSA,
  },

  data: function(){
    return {
      selected: false,
      dragStart: {x: 0, y: 0},
      dragCurr: {x: 0, y: 0},
      lastMouseLoc: {x: 0, y: 0},
      mouseLoc: {x: 0, y: 0},
      dragging: false,
      reshapePolygonMode: false,
      resizePolygonMode: false,
      ctx: null,
    
      polygonMasks: {},
      polygonReshapeIdx: -1,

      updateParentCurrentState: true,
      lastFrame: null,
      throttle: false,
    };
  },

  computed: {    
    current_state(){ return Object.values(this.targets).find(t => t.id == this.targetData.current_state_id) || Object.values(this.targets)[1]; },
    currentTargets(){ return utils.currentTargets(this.current_state, this.targets); },
    id(){ return this.targetData.id; },
    page(){ return this.targetData.page; },
    width(){ return this.targetData.width || this.info.window.width; },
    height(){ return this.targetData.height || this.info.window.height; },
    top(){ return this.targetData.top || 0 },
    left(){ return this.targetData.left || 0 },
    parentCanvas(){ return this.$parent.$refs[`loomVideoCanvas-${this.targetData.parentCanvas}`] || false; },
    currentPolygonPath2D(){ return utils.polyToPath2D(this.currentPolygonMask,0,0); },
    currentPolygonMaskString(){ return utils.polyToPolyString(this.currentPolygonMask,0,0); },
    currentPolygonMaskID(){
      for(let cs = this.current_state; cs && cs.parent_id != cs.id; cs = this.targets[cs.parent_id]){
        if(this.polygonMasks[cs.id]) return cs.id;
      }
      return 0;
    },
    currentPolygonMask(){ 
      return this.polygonMasks[this.currentPolygonMaskID];
    },
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
      if(target.id == '-1') return undefined;
      const loomObjectName = `loom${target.actor.charAt(0).toUpperCase() + target.actor.slice(1)}`;
      if(loomConfig[this.renderAppMode] && loomConfig[this.renderAppMode].mappings){
        const componentName = loomConfig[this.renderAppMode].mappings[loomObjectName];
        if(componentName && this.$options.components[componentName])
          return this.$options.components[componentName];
      }
      //defaults
      if(this.$options.components[loomObjectName])
        return this.$options.components[loomObjectName];

      return undefined;
    },

    changeState(target_id, offset = 0, changeParent=true, emit=true){
      this.changeStateWithFrameNo(this.targets[target_id].frame_no, offset, changeParent, emit);
    }, 

    changeStateWithFrameNo(frame, offset=0, changeParent=true, emit=true){
      const actualFrame = frame + 1 + offset;
      if(this.lastFrame == actualFrame) return;
      this.lastFrame = actualFrame;
      
      if(changeParent && this.updateParentCurrentState) this.$parent.changeStateWithFrameNo(frame, offset);

      /* const newpage = this.$parent.computeCurrentVideoTargets()[0];
      if(newpage !== null && newpage != this.page) return; */

      this.targetData.current_state_id = Object.values(this.targets).find(o => o.frame_no == frame).id;
      this.redraw(emit);
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

    copyRegions(regions, copyUI = true){ //not currently used
      this.cutRegions(regions, false, copyUI);
    },

    cutRegions(regions, cutout = true, copyUI = true){ 
      if(regions.length > 0 && !this.targetData.parentCanvas){ // auto-new page - create new loomVideoCanvas component
        this.$parent.newVideoTarget({
          parentCanvas: this.targetData.id, 
          startupFn: c => {
            c.cutRegions(regions, cutout, copyUI);
            c.emitter.emit('deselect');
            delete c.targetData.startupFn;
          },
          processed: true,
        });
        return;
      }

      if(regions.length > 0 && regions[0].constructor !== Array) regions = [regions];
      regions.forEach((region, i) => {

        const id = String(Object.keys(this.$parent.currentVideoTargets).length);

        this.$parent.currentVideoTargets[id] = {
          page: this.targetData.page,
          id,
          current_state_id: this.current_state.id,
          region,
          top: this.targetData.top,
          left: this.targetData.left,
          makeCutout: cutout,
          parentCanvas: this.targetData.id,
          cutouts: [],
          startupFn: c => {
            c.emitter.emit('deselect');
            delete c.targetData.startupFn;
          },
          processed: true,
        };
      });
    },

    resizePolygon(){
      const delta = { x: this.mouseLoc.x - this.lastMouseLoc.x, y: this.mouseLoc.y - this.lastMouseLoc.y };
      const scale = { x: (this.targetData.width + delta.x)/this.targetData.width, y: (this.targetData.height + delta.y)/this.targetData.height };
      this.targetData.width += delta.x;
      this.targetData.height += delta.y;
      this.$refs.canvas.width = this.width;
      this.$refs.canvas.height = this.height;
      utils.scalePolygon(this.polygonMasks[this.currentPolygonMaskID], scale);
      this.redraw();
    },

    reshapePolygon(e){
      const minD = 10;
      const c = this.polygonReshapeIdx;
      const n = this.currentPolygonMask.length;
      const nidx = (c+1)%n;
      const pidx = ((c-1)%n+n)%n;
      if(utils.dist(this.currentPolygonMask[c], this.currentPolygonMask[nidx]) < minD 
      || utils.dist(this.currentPolygonMask[c], this.currentPolygonMask[pidx]) < minD){
        this.currentPolygonMask.splice(c, 1);
        this.reshapePolygonMode = false;
        this.redraw();
        return;
      }
      this.currentPolygonMask[c] = e;

      const pc = this.parentCanvas;
      if(!pc){
        this.redraw(); 
        return;
      }
      const pcutouts = pc.targetData.cutouts;
      const cidx = pcutouts.findIndex(c => c.id == this.targetData.id);
      if(cidx >= 0){
        const newCutout = pcutouts[cidx];
        newCutout.poly = utils.polyToPolyString(this.currentPolygonMask, 0, 0);
        pcutouts.splice(cidx, 1, newCutout);
      }
      this.redraw();
    },

    addNewVertex(vertIdx, e){
      this.currentPolygonMask.splice(vertIdx+1, 0, e);
      this.reshapePolygonMode = true;
      this.polygonReshapeIdx = vertIdx+1;
      this.redraw();
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
      return {x: e.clientX - left - this.targetData.left, y: e.clientY - top - this.targetData.top};
    },
  
    onScreenMouseMove(e){
      this.lastMouseLoc = this.mouseLoc;
      this.mouseLoc = this.clientToOffset(e);
      if(this.reshapePolygonMode){
        this.reshapePolygon(this.mouseLoc);
        return;
      } else if(this.resizePolygonMode && this.targetData.resizeable == true){
        this.resizePolygon();
        return;
      } else if(!this.dragMode && this.targetData.reshapeable !== false || this.targetData.resizeable == true) {
        if(this.isPolygonVertexHovered(this.mouseLoc) >= 0){
          document.body.style.cursor = 'move';
        } else if(this.isPolygonLineHovered(this.mouseLoc) >= 0) {
          document.body.style.cursor = 'crosshair';
        }
      }

      if(!this.selected)  return;
      if(!this.dragging)  return;
      if(this.targetData.movable === false)  return;

      this.dragCurr = this.mouseLoc;
      if(this.dragMode){
        this.targetData.top += e.movementY;
        this.targetData.left += e.movementX;
      }
    },

    onScreenMouseDown(e){
      const mouseLoc = this.clientToOffset(e);
      const shift = e.shiftKey;

      if(this.targetData.reshapeable !== false || this.targetData.resizeable == true){
        const reshapePoly = this.isPolygonVertexHovered(mouseLoc);
        if(reshapePoly >= 0 && !this.dragMode){
          if(shift && this.targetData.resizeable){
            this.resizePolygonMode = true;
          } else if(this.targetData.reshapeable !== false) {
            this.resizePolygonMode = false;
            this.reshapePolygonMode = true;
            this.polygonReshapeIdx = reshapePoly;
          }
        }

        if(reshapePoly < 0 && this.targetData.reshapeable !== false){
          const newVertex = this.isPolygonLineHovered(mouseLoc);
          if(newVertex >= 0){  
            this.addNewVertex(newVertex, mouseLoc);
            this.redraw();
          }
        }
      }
    },

    onVideoMouseDown(e){
      document.body.style.cursor = 'default';
      this.selected = true;
      this.mouseLoc = this.clientToOffset(e);
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

    onScreenMouseUp(e){
      this.dragging = false;
      this.selected = false;
      this.resizePolygonMode = false;
      this.reshapePolygonMode = false;
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

    redraw(emit=false){
      this.emitter.emit('changeVideoFrame', [this.instanceID, this.page, this.id, this.lastFrame, emit]);
    },

    draw(videoPlayer, emit = true){
      if(this.throttle || !videoPlayer) return;
    
      this.ctx.restore();
      this.ctx.save();
      this.ctx.fillStyle = "rgba(0, 0, 0, 0)";
      this.ctx.clearRect(0, 0, this.width, this.height);

      /* if(this.currentPolygonMask){
        this.ctx.clip(this.currentPolygonPath2D);
      } */
      
      if(this.targetData.drawImage !== false){
        const xVideoRatio = videoPlayer.videoWidth/videoPlayer.clientWidth;
        const yVideoRatio = videoPlayer.videoHeight/videoPlayer.clientHeight;
        this.ctx.drawImage(videoPlayer, 0, 0, 
          this.width*xVideoRatio, this.height*yVideoRatio, 
          0, 0, this.width, this.height
        );
      }
      
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

      if(rects.length != 0) this.cutRegions(rects, true, true, false);
  
      src.delete(); contours.delete(); hierarchy.delete();
      this.$emit('frame_processed');
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
    this.ctx = this.$refs.canvas.getContext('2d');
    this.ctx.save();
    this.$refs.canvas.width = this.width;
    this.$refs.canvas.height = this.height;

    if(this.page == this.$parent.currentPage){
      this.targetData.current_state_id = this.start_state_id;
    }

    if(this.current_state !== undefined){
      this.changeState(this.current_state.id, 0, false);

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

      if(this.targetData.makeCutout && this.parentCanvas){
        const region = this.polygonMasks[this.current_state.id];

        const minX = Math.min(...region.map(p => p.x));
        const maxX = Math.max(...region.map(p => p.x));
        const minY = Math.min(...region.map(p => p.y));
        const maxY = Math.max(...region.map(p => p.y));

        const pcutouts = this.parentCanvas.targetData.cutouts;
        pcutouts.push({
          poly: utils.polyToPolyString(this.currentPolygonMask, 0, 0),
          width: maxX-minX,
          height: maxY-minY,
          top: minY,
          left: minX,
          id: this.targetData.id,
        });
      }
    }
    
    if(this.targetData.startupFn) {
      this.targetData.startupFn(this);
    }
    
    this.emitter.on('clearSelection', this.clearSelection);
    this.emitter.on('deselect', this.deselect);
    this.emitter.on(`changeState-${this.targetData.id}`, this.changeState);
    this.emitter.on('mousemove', this.onScreenMouseMove);
    this.emitter.on('mouseup', this.onScreenMouseUp);
    this.emitter.on('mousedown', this.onScreenMouseDown);

    this.selected = true;
    this.emitter.emit("selectVideoCanvas", this);
  },

  beforeUnmount(){
    //delete cutouts
    if(this.parentCanvas && this.parentCanvas.targetData){
      const id = this.parentCanvas.targetData.cutouts.findIndex(c => c.id === this.targetData.id);
      if(id >= 0) this.parentCanvas.targetData.cutouts.splice(id, 1);
    }

    //delete event listeners
    this.emitter.off('clearSelection', this.clearSelection);
    this.emitter.off('deselect', this.deselect);
    this.emitter.off(`changeState-${this.targetData.id}`, this.changeState);
    this.emitter.off('mousemove', this.onScreenMouseMove);
    this.emitter.off('mouseup', this.onScreenMouseUp);
    this.emitter.off('mousedown', this.onScreenMouseDown);
  },
  
}
</script>

<style scoped>
</style>