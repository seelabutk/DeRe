<template>
  <div
  ref="target" 
  :style="calcStyle">
    
  </div>
</template>

<script>
import utils from '../utils/utils'
export default {
  name: 'USAMap',
  props: ['targetData'],

  computed: {
    calcStyle(){
      const {xmin, xmax, ymin, ymax} = utils.boundingBox(this.$parent.targetData.region);
      return {
        position: "absolute",
        top: '0px',
        left: '0px',
        width: (xmax - xmin) + 'px',
        height: (ymax - ymin) + 'px',
        backgroundColor: 'blue',
        pointerEvents: 'none',
      };
    },
  },

  mounted: function(){
      console.log('added', this.$parent, this.$refs.target);
  },
  
}
</script>

<style scoped>
</style>