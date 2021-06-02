<template>
  <div :style="calcStyle">
    
    <div 
      v-if="targetData.shape.type != 'poly'"
      ref="element"
      v-on="eventData"
      style="width: 100%; height: 100%"
      :style="showHint ? calcHintStyle : {}"
    />

    <svg 
      v-if="targetData.shape.type == 'poly'"
      :width="calcStyle.width"
      :height="calcStyle.height"
      style="fill: transparent; stroke-width: 5;"
      :style="showHint ? calcHintStyle : {}"
    >
      <polygon ref="polygon" v-on="eventData" :points="points" />
    </svg>

  </div>
</template>

<script>
export default {
  name: 'loomTarget',
  props: ['targetData', 'showHint'],
  data: function(){
    return {
      points: null,
      eventData: {},
      brushing: false,
      brushing_start_x: 0,
      brushing_start_y: 0,
    };
  },
  computed: {
    calcHintStyle(){
      if(this.targetData.shape.type == 'rect'){
        return {
          'background-color': 'rgba(246, 230, 80, 0.7)',
          'border': '1px solid rgba(250, 240, 80, 0.8)',
        }
      } else {
        return {
          'fill': 'rgba(246, 230, 80, 0.7)',
          'stroke': 'rgba(250, 240, 80, 0.8)',
          'stroke-width': '2',
        };
      }
      
    },
    calcStyle(){
      let target = this.targetData;

      if(target.shape.type == 'rect'){
        return {
          position: "absolute",
          left: target.shape.x + 'px',
          top: target.shape.y + 'px',
          width: target.shape.width + 'px',
          height: target.shape.height + 'px',
        };
      } else if (target.shape.type == "circ") {
        return {
          position: "absolute",
          left: target.shape.centerX - target.shape.radius + 'px',
          top: target.shape.centerY - target.shape.radius + 'px',
          width: 2 * target.shape.radius + 'px',
          height: 2 * target.shape.radius + 'px',
          borderRadius: "50%"
        };
      } else if (target.shape.type == "poly") {
        let w,
          h,
          topOffset,
          leftOffset,
          minX = 100000,
          minY = 100000,
          maxX = -1,
          maxY = -1,
          polyString = "";

        for (let i = 0; i < target.shape.points.length; i++) {
          let x = target.shape.points[i].x;
          let y = target.shape.points[i].y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }

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
      }
    },

  },
  mounted: function(){
    let element = this.targetData.shape.type == 'poly' ? this.$refs.polygon : this.$refs.element;
    this.chooseCursor(this.targetData, element);
    this.registerCallback(this.targetData, element);
  },
  methods: {
    highlight(){
      //TODO
      console.log('highlighting!');
    },
    chooseCursor(target, element) {
      var cursor = "auto";

      if (target.actor == 'hover' || target.actor == 'brush')                           cursor = 'cell';
      else if (target.actor == 'button')                                                cursor = 'pointer';
      else if (target.actor == 'sliderx' || target.actor == 'horizontal-scroll')        cursor = 'ew-resize';
      else if (target.actor == 'arcball')                                               cursor = 'alias';
      else if (target.actor == 'vertical-slider' || target.actor == 'vertical-scroll')  cursor = 'ns-resize';

      element.style.cursor = cursor;
      return element;
    },
    registerCallback(target, handler){
      //untested
      if(target.type == "parallel" && target.actor == "button") {
        this.eventData['click'] = function(e) {
          this.emitter.emit('changeState', [this.targetData]);
        }.bind(this);
      } 
      
      //tested
      else if (target.type == "linear" && target.actor == "button") {
        this.eventData['click'] = function (e) {
          this.emitter.emit('changeState', [this.targetData]);
        }.bind(this);
      }
      //untested
      else if (target.type == "linear" && target.actor == "hover") {
        this.eventData["mouseover"] = function(e) {
          this.emitter.emit('changeState', [this.targetData]);
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

          this.emitter.emit('changeState', [this.targetData, offset]);
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

          this.emitter.emit('changeState', [this.targetData, offset]);
        }.bind(this);
      }
      
      
      //untested
      else if (target.type == "linear" && target.actor == "brush") {

        this.eventData["mousedown"] = function(e) {
          let arg = e.currentTarget;
          var target_offset = $(arg).offset();

          var rel_x = e.pageX - target_offset.left;
          var rel_y = e.pageY - target_offset.top;
          this.brushing = true;
          this.brushing_start_x = rel_x;
          this.brushing_start_y = rel_y;
          this.emitter.emit("show-brushing-box", true);
        }.bind(this);
        
        this.eventData["mouseup"] = function(e){
          this.brushing = false;
          this.emitter.emit("hide-brushing-box", false);
        }.bind(this);

        this.eventData["mousemove"] = function(e){
          if (this.brushing == false) return;

          let arg = e.currentTarget;
          var target_offset = $(arg).offset();
          var target_width = $(arg).outerWidth();
          var target_height = $(arg).outerHeight();

          let brushing_end_x = (e.pageX - target_offset.left);
          let brushing_end_y = (e.pageY - target_offset.top);

          let interval = 6; // the same as the one in interact.py - should be dynamic later

          let step_x = target_width / interval;
          let step_y = target_height / interval;
          let coord_x = Math.round(this.brushing_start_x / step_x) ;
          let coord_y = Math.round(this.brushing_start_y / step_y) ;

          let coord_w = Math.round((brushing_end_x - this.brushing_start_x) / step_x);
          let coord_h = Math.round((brushing_end_y - this.brushing_start_y) / step_y) - 1; // Why is this -1 important??

          /* let dim_x = interval;
          let dim_y = interval;
          let dim_w = interval;
          let dim_h = interval; */

          let offset = coord_h + coord_x * interval**3 + coord_w * interval + coord_y * interval ** 2; 
          
          /* var temp = {
            coord_x: coord_x,
            coord_y: coord_y,
            coord_w: coord_w, 
            coord_h: coord_h,
            offset: offset
          }; */

          $(".brushing-box").css({
            left: this.brushing_start_x + target_offset.left, 
            top: this.brushing_start_y + target_offset.top, 
            width: brushing_end_x - this.brushing_start_x,
            height: brushing_end_y - this.brushing_start_y
          });

          this.emitter.emit("changeState", [this.targetData, offset]);
        }.bind(this);
      }
      //untested
      else if (target.type == "linear" && target.actor == "drag") {
        handler.addEventListener("mousemove", function(e) {
          let arg = e.currentTarget;
          if (e.target.tagName == "polygon") arg = $(e.target).parent().parent();
          var target_offset = $(arg).offset();
          var target_height = $(arg).outerHeight();
          var rel_y = e.pageY - target_offset.top;
          var step_size = target_height / 10;
          var offset = rel_y / step_size;

          this.changeState(e.currentTarget, offset);
        }.bind(this));
      }
      //untested
      else if (target.type == "linear" && target.actor == "arcball") {
        var self = this;
        var arcball = $(handler).ArcballManager({
          width: target.shape.width,
          height: target.shape.height,
          frame_offset: parseInt(target["frame_no"]),
          interaction_callback: function() {
            self.changeState(handler[0]);
          }
        });
      }
    },

  },
}
</script>

<style scoped>
</style>