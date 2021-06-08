<template>
  <div id="ui-bar">
    <div class='grid-stack grid-stack-12'/>
  </div>
</template>

<script>
import { onMounted, watch, getCurrentInstance } from 'vue'
import { GridStack } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'
import 'gridstack/dist/gridstack-extra.min.css'
//import 'gridstack/dist/h5/gridstack-dd-native' 
import 'gridstack/dist/jq/gridstack-dd-jqueryui' // to get legacy jquery-ui drag&drop (support Mobile touch devices, h5 does not yet)

export default {
  name: 'UIBar',
  props: ['items'],
  components: {},

  setup(props, context){
    let grid = null;
    
    let app = getCurrentInstance(); //to access globalProperties (emitter)
    const itemData = watch(()=>props.items, (propItems) => {
      let items = propItems.map((item, i) => ({
        ...item, 
        id: i, 
        w: 1,
        h: 1,
      }));
      grid.removeAll();
      items.forEach(item => {
        let widget = grid.addWidget(item);
        widget.addEventListener('click', e => { //not very vue-like cuz gridstack sucks.
          app.appContext.config.globalProperties.emitter.emit('changeState', item.target);
        });
      });
    });

    onMounted(() => {
      grid = GridStack.init({
        float: false,
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
      /* grid.on('change', (event, items) => {
        items.forEach(item => {
          console.log('change! ', item);
        })
      }); */
    });

    return {
      grid,
      itemData,
    };
  }
}

</script>

<style>

  #ui-bar {
    width: 1200px;
    margin: 0 auto;
    height: 100px;
  }

  .grid-stack-item {
    cursor: pointer;
  }

 .grid-stack-item-content {
    color: rgb(204,204,204);
    text-align: center;
    background-color: rgb(45,45,45)
  }

</style>

