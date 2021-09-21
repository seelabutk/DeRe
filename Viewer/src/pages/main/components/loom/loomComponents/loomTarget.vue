<template>
    <div
    ref="target" 
    :style="calcStyle">

    <svg 
      v-if="targetData.shape.type == 'poly'"
      :width="calcStyle.width"
      :height="calcStyle.height"
      style="fill: transparent; stroke-width: 5;"
      :style="showHint ? calcHintStyle : {}"
    >
      <polygon ref="polygon" v-on="eventData" :points="points"/>
    </svg>

    <div 
      id="brushing-box" 
      ref="brushing-box" 
      :style="brushingBoxStyle"
    />

  </div>
</template>

<script>
export default {
  name: 'loomTarget',
  props: ['targetData', 'showHint'],
  emits: ['changeState', 'addHistory'],
  data: function(){
    return {
      points: null,
      eventData: {},
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
    calcHintStyle(){
      return {
        'fill': 'rgba(246, 230, 80, 0.7)',
        'stroke': 'rgba(250, 240, 80, 0.8)',
        'stroke-width': '2',
      };
    },
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
    calcStyle(){
      let target = this.targetData;
      let w,
        h,
        topOffset,
        leftOffset,
        polyString = "";

      let minX = this.targetData.shape.dimensions.min_x;
      let minY = this.targetData.shape.dimensions.min_y;
      let maxX = this.targetData.shape.dimensions.max_x;
      let maxY = this.targetData.shape.dimensions.max_y;

      for (let i = 0; i < target.shape.points.length; i++) {
        let x = target.shape.points[i].x;
        let y = target.shape.points[i].y;
        polyString += x - minX + "," + (y - minY);
        if (i !== target.shape.points.length - 1) polyString += " ";
      }

      w = maxX - minX;
      h = maxY - minY;
      topOffset = minY;
      leftOffset = minX;

      this.points = polyString;
      return {
        position: "absolute",
        top: topOffset + 'px',
        left: leftOffset + 'px',
        width: w + 'px',
        height: h + 'px',
      };
    },

  },
  mounted: function(){
    this.chooseCursor(this.targetData);
    this.registerCallback(this.targetData);
  },
  methods: {
    chooseCursor(target) {
      this.$refs.polygon.style.cursor = {
        "hover": "cell",
        "brush": "cell",
        "button": "pointer",
        "sliderx": "ew-resize",
        "horizontal-scroll": "ew-resize",
        "arcball": "alias",
        "vertical-slider": "ns-resize",
        "vertical-scroll": "ns-resize",
      }[target.actor] || "auto";
    },

    registerCallback(target){
      //untested
      if(target.type == "parallel" && target.actor == "button") {
        this.eventData['click'] = function(e) {
          this.$emit('changeState', this.targetData);
          this.$emit('addHistory', this.targetData, e)
        }.bind(this);
      } 
      
      //tested
      else if (target.type == "linear" && target.actor == "button") {
        this.eventData['click'] = function (e) {
          this.$emit('changeState', this.targetData);
          this.$emit('addHistory', this.targetData, e)
        }.bind(this);
      }
      //tested
      else if (target.type == "linear" && target.actor == "hover") {
        this.eventData["mouseover"] = function(e) {
          this.$emit('changeState', this.targetData);
          this.$emit('addHistory', this.targetData, e)
        }.bind(this);
      }

      //untested
      else if (target.type == "linear" && target.actor == "slider") {
        this.eventData["mousemove"] = function(e) {
          let arg = e.currentTarget;
          if (e.target.tagName == "polygon") arg = $(e.target).parent().parent();
          var target_offset = $(arg).offset();
          var target_height = $(arg).outerHeight();
          var rel_y = e.pageY - target_offset.top;
          var step_size = target_height / 20;
          var offset = rel_y / step_size;

          this.$emit('changeState', this.targetData, offset);
          this.$emit('addHistory', this.targetData, e)
        }.bind(this);
      }
      //untested
      else if (target.type == "linear" && target.actor == "sliderx") {
        this.eventData["mousemove"] = function(e) {
          let arg = e.currentTarget;
          if (e.target.tagName == "polygon") arg = $(e.target).parent().parent();
          var target_offset = $(arg).offset();
          var target_width = $(arg).outerWidth();
          var rel_x = e.pageX - target_offset.left;
          var step_size = target_width / 40;
          var offset = rel_x / step_size;

          this.$emit('changeState', this.targetData, offset);
          this.$emit('addHistory', this.targetData, e)
        }.bind(this);
      }

      //tested
      else if (target.type == "linear" && target.actor == "brush") {

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
          this.$emit('addHistory', this.targetData, e)
        }.bind(this);

        this.eventData["mousemove"] = function(e){
          if (this.brushing.state == false) return;

          let arg = e.currentTarget;
          var target_offset = $(arg).offset();
          var target_width  = this.targetData.shape.dimensions.max_x - this.targetData.shape.dimensions.min_x;
          var target_height = this.targetData.shape.dimensions.max_y - this.targetData.shape.dimensions.min_y;

          this.brushing.end_x = (e.pageX - target_offset.left);
          this.brushing.end_y = (e.pageY - target_offset.top);

          let interval = 6; // the same as the one in interact.py - should be dynamic later - divides space into 6x6 area

          let step_x = target_width / interval;
          let step_y = target_height / interval;
          let coord_x = Math.round(this.brushing.start_x / step_x);
          let coord_y = Math.round(this.brushing.start_y / step_y);

          let coord_w = Math.round((this.brushing.end_x - this.brushing.start_x) / step_x);
          let coord_h = Math.round((this.brushing.end_y - this.brushing.start_y) / step_y) - 1; // Why is this -1 important??

          let offset = coord_h*interval**0 + coord_w*interval**1 + coord_y*interval**2 + coord_x*interval**3; 
          this.$emit("changeState", this.targetData, offset);

        }.bind(this);
      }
      //untested
      else if (target.type == "linear" && target.actor == "drag") {
        this.$refs.polygon.addEventListener("mousemove", function(e) {
          let arg = e.currentTarget;
          if (e.target.tagName == "polygon") arg = $(e.target).parent().parent();
          var target_offset = $(arg).offset();
          var target_height = $(arg).outerHeight();
          var rel_y = e.pageY - target_offset.top;
          var step_size = target_height / 10;
          var offset = rel_y / step_size;

          this.$emit("changeState", e.currentTarget, offset);
          this.$emit('addHistory', this.targetData, e)
        }.bind(this));
      }
      //untested
      else if (target.type == "linear" && target.actor == "arcball") {
        var self = this;
        var arcball = $(this.$refs.polygon).ArcballManager({
          width: target.shape.width,
          height: target.shape.height,
          frame_offset: parseInt(target["frame_no"]),
          interaction_callback: function() {
            self.$emit("changeState", self.$refs.polygon[0]);
            self.$emit('addHistory', this.targetData, e)
          }
        });
      }
    },

  },
}
</script>

<style scoped>
  #brushing-box{
    border: 2px dashed #bbb;
    pointer-events: none;
  }
</style>