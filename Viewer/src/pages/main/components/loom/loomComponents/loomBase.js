
const mixin = {
  props: ['parent', 'targetData', 'showHint', 'interactable', 'current_state'],
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
      
      let minX = target.shape.dimensions.min_x;
      let minY = target.shape.dimensions.min_y;
      let maxX = target.shape.dimensions.max_x;
      let maxY = target.shape.dimensions.max_y;

      const len = Object.keys(target.shape.points).length;
      Object.values(target.shape.points).forEach((p, i) => {
        polyString += p.x - minX + "," + (p.y - minY);
        if (i !== len - 1) polyString += " ";
      });

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
  
  mounted(){
    if(this.$refs.target){
      this.$refs.target.style.display = this.interactable ? 'block': 'none';
    }
  },

  watch: {
    interactable: function(v){
      if(this.$refs.target){
        this.$refs.target.style.display = v ? 'block': 'none';
      }
    },
  },

  

  

  methods: {
    highlight(){
      //TODO
      console.log('TODO: highlighting!');
    },
  },
}

export default mixin;