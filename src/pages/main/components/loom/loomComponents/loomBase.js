import utils from '../utils/utils.js'

const mixin = {
  props: ['parent', 'vcTargetData', 'targetData', 'showHint', 'interactable', 'current_state', 'targets'],
  emits: ['changeState', 'addHistory'],
  name: 'loomComponent',
  data: function(){
    return {
      isLoomComponent: true,
      points: null,
      eventData: {},
    };
  },
  computed: {
    renderMode(){ return this.$parent.renderMode; }, 
    instanceID(){ return this.$parent.instanceID; },
    page(){ return this.$parent.page; },
    vcid(){ return this.$parent.id; },
    id(){ return this.targetData.id; },
    scale(){ return this.vcTargetData.scale || {x: 1.0, y: 1.0}; },
    frame(){ return this.targetData.frame_no; },
    componentID(){ return `${this.instanceID}-${this.page}-${this.vcid}-${this.id}` },
    calcHintStyle(){
      return {
        'fill': 'rgba(246, 230, 80, 0.7)',
        'stroke': 'rgba(250, 240, 80, 0.8)',
        'stroke-width': '2',
      };
    },
    calcStyle(){
      const target = this.targetData;
      let polyString = '';
      const polyArr = utils.ObjectToArray(target.shape.points);
      const poly = utils.scalePolygon(polyArr, this.scale);

      const min_x = target.shape.dimensions.min_x*this.scale.x;
      const min_y = target.shape.dimensions.min_y*this.scale.y;
      const max_x = target.shape.dimensions.max_x*this.scale.x;
      const max_y = target.shape.dimensions.max_y*this.scale.y;
      
      const len = poly.length;
      poly.forEach((p, i) => {
        polyString += `${p.x-min_x},${p.y-min_y}`;
        if(i !== len - 1) polyString += ' ';
      });
      this.points = polyString;
      const ret = {
        position: "absolute",
        top:    `${parseInt(min_y)}px`,
        left:   `${parseInt(min_x)}px`,
        width:  `${parseInt(max_x-min_x)}px`,
        height: `${parseInt(max_y-min_y)}px`,
      };
      return ret;
    },
  },
  
  mounted(){
    if(this.$refs.target){
      this.$refs.target.style.display = this.interactable ? 'block': 'none';
    }
    this.emitter.emit('addComponent', [this.componentID, this]);
  },

  beforeUnmount(){
    this.emitter.emit('removeComponent', this.componentID);
  },

  watch: {
    interactable: function(v){
      if(this.$refs.target){
        this.$refs.target.style.display = v ? 'block': 'none';
      }
    },
  },
}

export default mixin;