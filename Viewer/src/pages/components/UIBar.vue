<template>
  <div class='grid-stack grid-stack-12'>
    <div class="grid-stack-item" gs-w="3">
      <div class="grid-stack-item-content">Test</div>
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

export default {
  setup(props, context){
    
    let grid = null;

    const items = [
      //{autoPosition, x, y, w, h, maxW, minW, maxH, minH, locked, noResize, noMove, resizeHandles, id, content, subGrid}
      { x: 2, y: 0, h: 1 },
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
        margin: '2px',
        row: 3,
        column: 12,
        minRow: 1,
        resizable: {
          handles: ' ', //not resizable
        },
        alwaysShowResizeHandle: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      });

      grid.load(items);
      
      //added, change, disable, dragstart, dragstop, dropped, enable, removed, resizestart, resize, resizestop
      grid.on('change', (event, items) => {
        items.forEach(item => {
          console.log(event.type, item);
        })
      });
    });

    return {
      grid,
    };
  },
}

</script>

<style>


  .grid-stack {
    background: hsl(189, 100%, 91%);
    width: 90%;
  }

  .grid-stack-item-content {
    color: black;
    text-align: center;
    background-color: hsl(239, 77%, 42%);
  }

  .grid-stack-item-removing {
    opacity: 0.5;
  }
  
  /* extra */
  .sidebar .grid-stack-item {
    width: 120px;
    height: 50px;
    border: 2px dashed green;
    text-align: center;
    line-height: 35px;
    z-index: 10;
    background: rgba(0, 255, 0, 0.1);
    cursor: default;
    display: inline-block;
  }
  .sidebar .grid-stack-item .grid-stack-item-content {
    background: none;
  }
</style>

