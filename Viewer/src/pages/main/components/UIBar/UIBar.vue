<template>
  <div id="ui-bar">
    <div class='grid-stack grid-stack-12'>
      <u-i-item 
        v-for="item in items"
        :key="item.id"
        :itemData="item"
      />
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { GridStack } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'
import 'gridstack/dist/gridstack-extra.min.css'
//import 'gridstack/dist/h5/gridstack-dd-native' 
import 'gridstack/dist/jq/gridstack-dd-jqueryui' // to get legacy jquery-ui drag&drop (support Mobile touch devices, h5 does not yet)

import UIItem from './UIItem.vue'

export default {
  name: 'UIBar',
  props: [],
  components: {
    UIItem,
  },
  setup(props, context){
    
    let grid = null;

    const items = [
      //{autoPosition, x, y, w, h, maxW, minW, maxH, minH, locked, noResize, noMove, resizeHandles, id, content, subGrid}
      { x: 2, y: 0, h: 1, eventData: {click: context.clickTest}},
      { x: 0, y: 2, w: 4 },
      { x: 3, y: 1, h: 1 },
      { x: 3, y: 0, h: 1 },
      { x: 0, y: 0, w: 2, h: 1 },
    ];
    items.forEach((item, i) => item.content = i);

    onMounted(() => {
      grid = GridStack.init({
        float: true,
        cellHeight: "25px",
        margin: '0.5px',
        row: 1,
        column: 12,
        minRow: 1,
        resizable: {
          handles: ' ', //not resizable
        },
        alwaysShowResizeHandle: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      });
      
      //added, change, disable, dragstart, dragstop, dropped, enable, removed, resizestart, resize, resizestop
      grid.on('change', (event, items) => {
        items.forEach(item => {
          console.log(event.type, item);
        })
      });
    });

    return {
      grid,
      items,
    };
  },

  methods: {
    clickTest(e){
      console.log('clicked', e);
    }
  },
}

</script>

<style>

  #ui-bar {
    width: 1200px;
    margin: 0 auto;
    height: 100px;
  }
</style>

