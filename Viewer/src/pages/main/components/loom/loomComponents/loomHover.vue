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
      <polygon ref="polygon"
        v-on="eventData"
        :points="points"
        style="cursor: pointer;"
      />
    </svg>
  </div>
</template>

<script>
import loomBase from './loomBase'
export default {
  name: 'loomHover',
  mixins: [loomBase],

  mounted: function(){
    this.eventData['mouseover'] = function(e) {
      this.$emit('changeState', this.targetData);
      this.$emit('addHistory', this.targetData, e)
    }.bind(this);
  },
  
}
</script>

<style scoped>
</style>