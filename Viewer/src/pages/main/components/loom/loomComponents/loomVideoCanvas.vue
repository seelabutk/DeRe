<template>
  <div>
    <!-- positioning of canvas, cutouts, components !-->
    <div
      :style="{
        position: 'absolute',
        width: width + 'px',
        height: height + 'px',
        top: top + 'px',
        left: left + 'px',
        outline: '1px dashed black',
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
        v-for="(target, id) in cutouts"
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
          @change-state="$parent.changeState"
          @add-history="$parent.updateInteractionHistory"
        />
      </div>
    </div>
    
  </div>
</template>

<script>

// TODO: get rid of $parent stuff, pass through events via loomVideoCanvas in loom.vue
//fix multiple select regions at once from different canvases

import loomBase from './loomBase.js'
import utils from './utils.js'
import polygonClipping from 'polygon-clipping'

import loomBrushingBox from './loomBrushingBox.vue'
import loomButton from './loomButton.vue'
import loomTarget from './loomTarget.vue'
import loomHover from './loomHover.vue'
import loomDropdown from './loomDropdown.vue'

export default {
  name: 'loomVideoCanvas',
  mixins: [loomBase],
  emits: ['mousemove'],

  props: ['regionSelect', 'overlay', 'renderMode', 'loomConfig', 'current_state', 'currentConfig'],
  components: {
    loomTarget,
    loomButton,
    loomHover,
    loomDropdown,
    loomBrushingBox,
  },

  data: function(){
    return {
      dragStart: {x: 0, y: 0},
      dragCurr: {x: 0, y: 0},
      dragging: false,
      dragMode: false,

      left: 0,
      top: 0,
      width: 0,
      height: 0,
      oleft: 0,
      otop: 0,
      
      cutouts: [],
      video: null,
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
      if(this.loomConfig[this.renderMode] && this.loomConfig[this.renderMode].mappings){
        const componentName = this.loomConfig[this.renderMode].mappings[loomObjectName];
        if(componentName && this.$options.components[componentName])
          return this.$options.components[componentName];
      }
      //defaults
      if(this.$options.components[loomObjectName])
        return this.$options.components[loomObjectName];
      return undefined;//loomTarget
    },

    cutRegion(){
      if(this.dragStart.x > this.dragCurr.x)  [this.dragStart.x, this.dragCurr.x] = [this.dragCurr.x, this.dragStart.x];
      if(this.dragStart.y > this.dragCurr.y)  [this.dragStart.y, this.dragCurr.y] = [this.dragCurr.y, this.dragStart.y];
      const id = String(this.dragStart.x) + '-' + String(this.dragStart.y) + '-' + String(this.dragCurr.x) + '-' + String(this.dragCurr.y);

      const offset = {x: 0, y: 0};
      for(let pc = this.targetData.parentCanvas; pc; pc = pc.targetData.parentCanvas){
        const nestedOrigin = pc.cutouts[pc.cutouts.length-1].start; //last appended cutout will be correct location
        offset.x += nestedOrigin.x;
        offset.y += nestedOrigin.y;
      }

      const start = {x: this.dragStart.x + offset.x, y: this.dragStart.y + offset.y};
      const end = {x: this.dragCurr.x  + offset.x, y: this.dragCurr.y  + offset.y};

      this.$parent.videoTargets[id] = {
        id,
        top: this.top + this.dragStart.y,
        left: this.left + this.dragStart.x,
        start, end,
        parentCanvas: this,
        video: this.$parent.$refs.videoPlayer,
        targets: this.cutCurrentRegionTargets({start, end}),
      };
      
      this.cutouts.push({
        start: {...this.dragStart},
        end: {...this.dragCurr},
      });
      this.dragStart = this.dragCurr = {x: -10000, y: -10000};
    },

    splitTarget(region, target){
      let target1 = JSON.parse(JSON.stringify(target)); //deep copy
      const poly1 = [[
        [region.start.x, region.start.y],
        [region.end.x  , region.start.y],
        [region.end.x  , region.end.y  ],
        [region.start.x, region.end.y  ],
        [region.start.x, region.start.y], //https://datatracker.ietf.org/doc/html/rfc7946 - "The first and last positions are equivalent, and they MUST contain identical values"
      ]];

      let target2 = JSON.parse(JSON.stringify(target)); //deep copy
      const poly2 = [target.shape.points.map( p => [p.x, p.y] )];

      let innerPolygon = polygonClipping.intersection(poly1, poly2)[0]; //todo: intersect all these into 1 poly
      let outerPolygon = polygonClipping.difference(poly2, poly1)[0];

      if(innerPolygon)  target1.shape.points = innerPolygon[0].map(p => ({x: p[0], y: p[1]}));
      else  target1 = null;
      
      if(outerPolygon)  target2.shape.points = outerPolygon[0].map(p => ({x: p[0], y: p[1]}));
      else target2.delete = true;
    
      return [target1, target2];
    },

    cutCurrentRegionTargets(region){
      let splitParent = [];
      let targets = [];
      let parents = [];

      Object.values(this.targets).forEach(target => {
        if(target.name == "root") return;
        const [split1, split2] = this.splitTarget(region, target)
        if(split1)  targets.push(split1);
        if(split2)  splitParent.push(split2);
      });

      splitParent.forEach(split => {
        const key = Object.keys(this.targets).find(key => this.targets[key].id == split.id);
        if(!split.delete) this.targets[key] = split;
        else delete this.targets[key];
      });

      targets.forEach(target => {
        const parent = utils.findByName(target.parent, this.targets);
        if(parents.find(p => p.id == parent.id) === undefined){
          parents.push(parent)
        }
      });
      targets = targets.concat(parents);

      return targets;
    },

    onVideoMouseMove(e){
      if(!this.dragging)  return;

      this.dragCurr = {x: e.offsetX, y: e.offsetY};
      if(this.dragMode){
        this.top += e.movementY;
        this.left += e.movementX;
      }
    },
    
    isRightMouseButton(e){
      if("which" in e)  return e.which == 3;
      if("button" in e) return e.button == 2;
    },

    onVideoMouseDown(e){
      this.dragCurr = this.dragStart = {x: -10000, y: -10000};

      if(!this.isRightMouseButton(e)){
        this.dragMode = !e.shiftKey;
        this.dragging = this.regionSelect;
        if(e.shiftKey)
          this.dragCurr = this.dragStart = {x: e.offsetX, y: e.offsetY};
      }
      return false;
    },

    onVideoMouseUp(e){
      this.dragging = false;
    },

    redraw(){
      const canvas = this.$refs.canvas;
      const ctx = canvas.getContext('2d');
      
      const xVideoRatio = this.video.videoWidth/this.video.clientWidth;
      const yVideoRatio = this.video.videoHeight/this.video.clientHeight;
      
      ctx.drawImage(this.video, this.oleft*xVideoRatio, this.otop*yVideoRatio, 
        this.width*xVideoRatio, this.height*yVideoRatio, 
        0, 0, this.width, this.height
      );
    },

    processFrame(){
      const canvas = this.$refs.canvas;
      canvas.width = this.width;
      canvas.height = this.height;

      this.redraw();
      
      /* canvas.toBlob((blob)=>{
      }, 'image/png'); */
    },
  },

  mounted(){
    this.video = this.targetData.video;

    this.width = this.targetData.end.x - this.targetData.start.x;
    this.height = this.targetData.end.y - this.targetData.start.y;
    
    this.oleft = this.targetData.start.x;
    this.otop = this.targetData.start.y;

    this.top =  this.targetData.top  != undefined ? this.targetData.top  : this.otop;
    this.left = this.targetData.left != undefined ? this.targetData.left : this.oleft;

    this.processFrame();
    this.emitter.on('frameChange', () => {
      this.redraw();
    });

  },
  
}
</script>

<style scoped>
.overlay {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}
</style>