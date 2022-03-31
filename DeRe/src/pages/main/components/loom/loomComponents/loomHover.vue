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
  emits: ['onmouseleave'],

  mounted: function(){
    this.eventData['mouseover'] = function(e) {
      window.timeLogger.push(new Date().getTime())
      this.$emit('changeState', this.targetData.id);
      this.$emit('addHistory', this.targetData, e)
    }.bind(this);
    this.eventData['mouseleave'] = function(e){
      this.$emit('onmouseleave');
    }.bind(this);
  },
  
}
</script>

<style scoped>
</style>