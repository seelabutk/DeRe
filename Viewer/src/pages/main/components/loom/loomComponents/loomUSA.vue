<template>
  <div
  ref="target" 
    :style="calcStyle"
  >
  
  </div>
</template>

<script>
import utils from '../utils/utils'
export default {
  name: 'USAMap',
  props: ['targetData'],

  computed: {

    width(){ return this.$parent.targetData.width; },
    height(){return this.$parent.targetData.height; },
    calcStyle(){
      return {
        position: "absolute",
        top: '0px',
        left: '0px',
        width: this.width + 'px',
        height: this.height + 'px',
        backgroundColor: 'rgba(0,0,0,0.2)',
        // pointerEvents: 'none',
        backgroundImage: 'url(assets/USA.png)',
        backgroundSize: `${this.width}px ${this.height}px`,
      };
    },
  },

  data: function(){
    return {
      stateCenters: {
        'WA': {x: 0.084, y: 0.097},
        'ID': {x: 0.183, y: 0.266},
        'MT': {x: 0.267, y: 0.115},
        'ND': {x: 0.425, y: 0.095},
        'MN': {x: 0.527, y: 0.145},
        'MI': {x: 0.691, y: 0.270},
        'ME': {x: 0.958, y: 0.192},
        'OR': {x: 0.077, y: 0.261},
        'WY': {x: 0.304, y: 0.286},
        'SD': {x: 0.427, y: 0.229},
        'WI': {x: 0.602, y: 0.220},
        'NY': {x: 0.856, y: 0.295},
        'VT': {x: 0.895, y: 0.250},
        'NH': {x: 0.915, y: 0.275},
        'MA': {x: 0.917, y: 0.314},
        'CT': {x: 0.892, y: 0.353},
        'RI': {x: 0.914, y: 0.353},
        'CA': {x: 0.090, y: 0.526},
        'NV': {x: 0.142, y: 0.427},
        'UT': {x: 0.230, y: 0.439},
        'CO': {x: 0.334, y: 0.457},
        'NE': {x: 0.431, y: 0.354},
        'IA': {x: 0.542, y: 0.330},
        'IL': {x: 0.616, y: 0.411},
        'IN': {x: 0.664, y: 0.414},
        'OH': {x: 0.722, y: 0.402},
        'PA': {x: 0.811, y: 0.384},
        'NJ': {x: 0.862, y: 0.425},
        'KS': {x: 0.455, y: 0.473},
        'MO': {x: 0.557, y: 0.478},
        'KY': {x: 0.685, y: 0.511},
        'WV': {x: 0.762, y: 0.464},
        'MD': {x: 0.847, y: 0.476},
        'DE': {x: 0.858, y: 0.455},
        'VA': {x: 0.801, y: 0.510},
        'AZ': {x: 0.230, y: 0.633},
        'NM': {x: 0.327, y: 0.628},
        'TX': {x: 0.451, y: 0.743},
        'OK': {x: 0.477, y: 0.589},
        'AR': {x: 0.560, y: 0.614},
        'TN': {x: 0.664, y: 0.578},
        'NC': {x: 0.785, y: 0.580},
        'LA': {x: 0.556, y: 0.727},
        'MS': {x: 0.606, y: 0.690},
        'AL': {x: 0.657, y: 0.691},
        'GA': {x: 0.715, y: 0.691},
        'SC': {x: 0.761, y: 0.651},
        'FL': {x: 0.741, y: 0.848}
      }
    }
  },

  methods: {
    getRelativeStateCenters(){
      return Object.fromEntries(Object.entries(this.stateCenters).map(([state, loc]) => {
        return [state, {x: loc.x*this.width, y: loc.y*this.height}];
      }));
    }
  },

  mounted: function(){},
  
}
</script>

<style scoped>
</style>