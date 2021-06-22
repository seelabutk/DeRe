<template>
  <div :style="calcStyle">
    <svg 
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
    points(){
      let target = this.targetData;
      let polyString = "";

      let minX = this.targetData.shape.dimensions.min_x;
      let minY = this.targetData.shape.dimensions.min_y;

      for (let i = 0; i < target.shape.points.length; i++) {
        let x = target.shape.points[i].x;
        let y = target.shape.points[i].y;
        polyString += x - minX + "," + (y - minY);
        if (i !== target.shape.points.length - 1) polyString += " ";
      }

      return polyString;
    },
    calcStyle(){
      
      return {
        position: "absolute",
        top: this.targetData.dimensions.min_y + 'px',
        left: this.targetData.dimensions.min_x + 'px',
        width: this.targetData.dimensions.max_x + 'px',
        height: this.targetData.dimensions.max_y + 'px',
      };
    },
  },

  mounted: function(){
    this.chooseCursor(this.targetData);
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
  },
}
</script>

<style scoped>

</style>