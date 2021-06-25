<template>
  <div :style="calcStyle">
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
        style="cursor: pointer;"
      />
    </svg>
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
    this.eventData['click'] = function(e) {
      this.$emit('changeState', this.targetData);
      this.$emit('addHistory', this.targetData, e)
    }.bind(this);
  },

  methods: {
    highlight(){
      //TODO
      console.log('TODO: highlighting!');
    },
  },
}
</script>

<style scoped>
</style>