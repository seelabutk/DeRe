<template>
  <div>
    
    <div
      :style="{
        position: 'absolute',
        width: width + 'px',
        height: height + 'px',
        top: top + 'px',
        left: left + 'px',
      }"
    >
      
      
      <canvas
        ref="canvas"
        style="width: 100%; height: 100%;"
        @mousedown="onVideoMouseDown"
        @mouseup="onVideoMouseUp"
        @click="dragging=false"
        @mousemove="onVideoMouseMove"
        @mouseleave="dragging=false"
      />
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
      <div :style="dragSelectStyle"/>
      <div 
        class='overlay'
        :style='{display: overlay ? "block" : "none"}'
      />
      <div
        class="offset"
        :style="{
          position: 'absolute',
          top: String(-otop) + 'px',
          left: String(-oleft) + 'px',
        }"
      >
        <component 
          v-for="target in targetData.targets"
          :key="target.id" 
          :is="$parent.getComponent(target)" 
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
//move loomObject ui to new cut location

import loomBase from './loomBase'
export default {
  name: 'loomVideoCanvas',
  mixins: [loomBase],
  emits: ['mousemove'],

  props: ['regionSelect', 'overlay', 'currentTargets'],

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

      video: null,

      cutouts: [],
    };
  },

  computed: {
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
        targets: this.offsetTargets(this.currentRegionTargets({start, end}), this.dragStart),
      };
      
      this.cutouts.push({
        start: {...this.dragStart},
        end: {...this.dragCurr},
      });
      this.dragStart = this.dragCurr = {x: -10000, y: -10000};
    },

    offsetTargets(targets, offset){
      //idk what to do here..
      return targets;
    },

    targetInRegion(region, target){
      if(!target || !target.shape || !target.shape.points)  return false;
      const points = target.shape.points;
      for(let i = 0; i < points.length; ++i){
        const p = points[i];
        if(p.x >= region.start.x && p.x <= region.end.x && p.y >= region.start.y && p.y <= region.end.y){
          return true;
        }
      }
      return false;
    },
    currentRegionTargets(region){
      return this.currentTargets.filter((target) => {
        return this.targetInRegion(region, target);
      });
    },

    onVideoMouseMove(e){
      if(!this.dragging)  return;

      this.dragCurr = {x: e.offsetX, y: e.offsetY};
      if(this.dragMode){
        this.top += e.movementY;
        this.left += e.movementX;
        //this.$parent.drawMiniMap(); - doesn't work since position only changes relative to canvas
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

    this.eventData['click'] = function(e) {
      this.$emit('changeState', this.targetData);
      this.$emit('addHistory', this.targetData, e)
    }.bind(this);

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