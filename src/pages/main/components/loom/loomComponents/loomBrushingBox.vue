<template>
  <div
    ref="target" 
    :id="componentID"
    :style="calcStyle"
  >
    <svg 
      v-if="targetData.shape.type == 'poly'"
      :width="calcStyle.width"
      :height="calcStyle.height"
      style="fill: transparent; stroke-width: 5;"
      :style="showHint ? calcHintStyle : {}"
    >
      <polygon ref="polygon"    
        v-on="eventData"
        :points="points"
        style="cursor: cell;"
      />
    </svg>

    <div 
      id="brushing-box" 
      ref="brushing-box" 
      :style="brushingBoxStyle"
    />
  </div>
</template>

<script>
//todo: brushing backwards
import $ from 'jquery'
import mixin from './loomBase'

export default {
  name: 'loomBrushingBox',
  mixins: [mixin],
  data: function(){
    return {
      brushing: {
        state: false,
        start_x: 0,
        start_y: 0,
        end_x: 0,
        end_y: 0,
      }
    };
  },
  computed: {
    brushingBoxStyle: function(){
      return {
        position: 'absolute',
        visibility: this.brushing.state ? 'visible' : 'hidden',
        top: this.brushing.start_y + 'px',
        left: this.brushing.start_x + 'px',
        width: this.brushing.end_x - this.brushing.start_x + 'px',
        height: this.brushing.end_y - this.brushing.start_y + 'px', 
      };
    },
  },
  mounted: function(){
    this.eventData["mousedown"] = function(e) {
      let arg = e.currentTarget;
      var target_offset = $(arg).offset();

      var rel_x = e.pageX - target_offset.left;
      var rel_y = e.pageY - target_offset.top;
      this.brushing.state = true;
      this.brushing.start_x = this.brushing.end_x = rel_x;
      this.brushing.start_y = this.brushing.end_y = rel_y;
      this.$emit('addHistory', this.targetData, e)
    }.bind(this);
    
    this.eventData["mouseup"] = function(e){
      this.brushing.state = false;
      //this.$emit('addHistory', this.targetData, e)
    }.bind(this);

    this.eventData["mousemove"] = function(e){
      if (this.brushing.state == false) return;

      const arg = e.currentTarget;
      const target_offset = $(arg).offset();
      const target_width  = this.targetData.shape.dimensions.max_x - this.targetData.shape.dimensions.min_x;
      const target_height = this.targetData.shape.dimensions.max_y - this.targetData.shape.dimensions.min_y;

      this.brushing.end_x = (e.pageX - target_offset.left);
      this.brushing.end_y = (e.pageY - target_offset.top);

      const interval = 6; // the same as the one in interact.py - should be dynamic later - divides space into 6x6 area

      const step_x = target_width / interval;
      const step_y = target_height / interval;
      const coord_x = Math.round(this.brushing.start_x / step_x);
      const coord_y = Math.round(this.brushing.start_y / step_y);

      const coord_w = Math.round((this.brushing.end_x - this.brushing.start_x) / step_x);
      const coord_h = Math.round((this.brushing.end_y - this.brushing.start_y) / step_y) - 1; // Why is this -1 important??

      const offset = coord_h*interval**0 + coord_w*interval**1 + coord_y*interval**2 + coord_x*interval**3; 
      this.$emit("changeState", this.targetData.id, offset);

    }.bind(this);
  },
}
</script>

<style scoped>
  #brushing-box{
    border: 2px dashed #bbb;
    pointer-events: none;
  }
</style>