<template>
  <div
    ref="target" 
    :style="calcStyle"
    @click="onclick"
  >
  </div>
</template>

<script>
import utils from '../utils/utils'
export default {
  name: 'USAMap',
  props: ['targetData', 'vcTargetData'],
  inject: ['manager'],
  computed: {
    width(){ return this.$parent.targetData.width*this.scale.x; },
    height(){ return this.$parent.targetData.height*this.scale.y; },
    scale(){ return this.vcTargetData.scale || {x: 1.0, y: 1.0}; },
    calcStyle(){
      return {
        position: "absolute",
        top: '0px',
        left: '0px',
        width: `${this.width}px`,
        height: `${this.height}px`,
        backgroundColor: 'rgba(0,0,0,0.2)',
        backgroundImage: `url(assets/USA_${this.projectionType}.png)`,
        backgroundSize: `${this.width}px ${this.height}px`,
      };
    },
    stateCenters(){ return this.stateCentersTypes[this.projectionType]; }
  },

  data: function(){
    return {
      projectionTypes: ['mercator', 'lambert'],
      projectionType: null,
      stateCentersTypes: {
        'mercator': {
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
          'FL': {x: 0.741, y: 0.848},
        },
        'lambert': {
          'WA': {x: 0.221, y: 0.079},
          'ID': {x: 0.290, y: 0.241},
          'MT': {x: 0.377, y: 0.141},
          'ND': {x: 0.502, y: 0.147},
          'MN': {x: 0.589, y: 0.203},
          'MI': {x: 0.742, y: 0.285},
          'ME': {x: 0.961, y: 0.132},
          'OR': {x: 0.195, y: 0.203},
          'WY': {x: 0.391, y: 0.303},
          'SD': {x: 0.503, y: 0.262},
          'WI': {x: 0.663, y: 0.253},
          'NY': {x: 0.891, y: 0.250},
          'VT': {x: 0.918, y: 0.206},
          'NH': {x: 0.939, y: 0.212},
          'MA': {x: 0.939, y: 0.253},
          'CT': {x: 0.931, y: 0.285},
          'RI': {x: 0.949, y: 0.282},
          'CA': {x: 0.173, y: 0.453},
          'NV': {x: 0.237, y: 0.385},
          'UT': {x: 0.315, y: 0.429},
          'CO': {x: 0.412, y: 0.462},
          'NE': {x: 0.512, y: 0.376},
          'IA': {x: 0.609, y: 0.359},
          'IL': {x: 0.675, y: 0.421},
          'IN': {x: 0.727, y: 0.415},
          'OH': {x: 0.781, y: 0.391},
          'PA': {x: 0.859, y: 0.341},
          'NJ': {x: 0.914, y: 0.356},
          'KS': {x: 0.529, y: 0.494},
          'MO': {x: 0.633, y: 0.503},
          'KY': {x: 0.747, y: 0.503},
          'WV': {x: 0.815, y: 0.450},
          'MD': {x: 0.880, y: 0.397},
          'DE': {x: 0.901, y: 0.406},
          'VA': {x: 0.854, y: 0.485},
          'AZ': {x: 0.296, y: 0.612},
          'NM': {x: 0.391, y: 0.629},
          'TX': {x: 0.508, y: 0.756},
          'OK': {x: 0.549, y: 0.603},
          'AR': {x: 0.630, y: 0.629},
          'TN': {x: 0.734, y: 0.574},
          'NC': {x: 0.854, y: 0.556},
          'LA': {x: 0.633, y: 0.768},
          'MS': {x: 0.680, y: 0.697},
          'AL': {x: 0.731, y: 0.688},
          'GA': {x: 0.793, y: 0.691},
          'SC': {x: 0.835, y: 0.626},
          'FL': {x: 0.840, y: 0.844},
          'AL': {x: 0.175, y: 0.821},
          'HI': {x: 0.414, y: 0.974},
        }
      }
    }
  },

  methods: {
    getRelativeStateCenters(){
      const box = this.$refs.target.getBoundingClientRect();
      return Object.fromEntries(Object.entries(this.stateCenters).map(([state, loc]) => {  
        return [state, {x: loc.x*this.width + box.x, y: loc.y*this.height + box.y }];
      }));
    },
    async getMapping(){
      this.manager.regionSelect.value = false;
      return await this.$nextTick(() => {
        const linkFroms = Object.fromEntries(Object.entries(this.getRelativeStateCenters()).map(([state, loc]) => {
          const els = document.elementsFromPoint(...Object.values(loc));
          const el = els.find(el => el.id != '');
          if(el === undefined)  return null;
          const id = el.id;
          
          const component = this.manager.activeComponents.value[id];
          if(component === undefined || !component.isLoomComponent) return null;
          return [state, {
            mode: component.renderMode,
            instance: component.instanceID,
            page: component.page,
            vcid: component.vcid,
            frame: component.frame,
          }];
        }).filter(ld => ld != null));
        this.manager.regionSelect.value = true;
        return linkFroms;
      });
    }
  },

  mounted: function(){
    this.projectionType = 'lambert';
  },
}
</script>

<style scoped>
</style>