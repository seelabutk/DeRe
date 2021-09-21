<template>
  <div id="ui-bar">
    <div class='grid-stack grid-stack-12'/>
  </div>
</template>

<script>
import { ref, onMounted, watch, getCurrentInstance } from 'vue'
import { GridStack } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'
import 'gridstack/dist/gridstack-extra.min.css'
//import 'gridstack/dist/h5/gridstack-dd-native' 
import 'gridstack/dist/jq/gridstack-dd-jqueryui' // to get legacy jquery-ui drag&drop (support Mobile touch devices, h5 does not yet)

export default {
  name: 'UIBar',
  components: {},

  setup(props, context){
    let grid = null;
    const items = ref([]);
    const confidence = 5;
    const app = getCurrentInstance(); //to access globalProperties (emitter)

    const runInteractionAnalysis = function(interactionHistory){
      let {order, interactions} = calcMostFrequentInteractions(interactionHistory);
      
      order = order.filter(k => interactions[k].frames.length > 1); //filter out all single-buttons
      order = order.filter((k, i) => {
        let lastFrame = interactions[k].frames[interactions[k].frames.length-1];
        return !order.slice(0, i).some((e)=> lastFrame == interactions[e].frames[interactions[e].frames.length-1]);
      }); //filter out all interactions that end with the same frame (same result)
      
      order = order.filter(k => {
        let lastFrame = interactions[k].frames[interactions[k].frames.length-1];
        return !items.value.some(s => lastFrame == s.id);
      }); //filter out previously added elements      

      for(let i=0, j=0; i < order.length && j < 30; ++i){ //choose 30 most relevant elements
        let interaction = interactions[order[i]];

        if(interaction.n >= confidence){ //confidence of at least 5 occurrences
          ++j;

          let target = interaction.targets[interaction.targets.length-1];

          let vc = interaction.vc;
          items.value = items.value.concat({
            id: target.id,
            content: target.name,
            target,
            vc,
          });
        }
      }
    };

    const calcMostFrequentInteractions = function(interactionHistory){
      let n = interactionHistory.length;
      let m = {};

      for(let i = 0; i < n; ++i){
        let ss = [];
        let s = '';
        for(let j = i; j < n; ++j){
          
          const {id} = interactionHistory[j];
          const vc = interactionHistory[j].videoCanvas;
          ss.push(id);
          s += '-' + String(id);

          if (m[s] == undefined) m[s] = { frames: [], n: 0, vc };

          m[s].frames = [...ss]; //clone
          m[s].targets = m[s].frames.map(s => interactionHistory.find(i => i.id == s).target);
          m[s].n++;
        }
      }

      const ids = Object.keys(m);
      ids.sort((a,b) => {
        if(m[a].n > m[b].n)  return -1;
        else if (m[a].n == m[b].n && m[a].frames.length > m[b].frames.length) return -1;
        else return 1;
      });

      return {
        order: ids,
        interactions: m,
      };
    };

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

      app.appContext.config.globalProperties.emitter.on('getShortcutItems', () => items );
      app.appContext.config.globalProperties.emitter.on('createShortcutItem', (item) => items.push(item) );
      app.appContext.config.globalProperties.emitter.on('runInteractionAnalysis', runInteractionAnalysis );
    });

    watch(items, (vitems) => {
      grid.removeAll();
      vitems.map((item, i) => ({
        w: 1,
        h: 1,
        ...item, 
        id: i,
      })).forEach(item => {
        let widget = grid.addWidget(item);
        widget.addEventListener('click', e => { //not very vue-like cuz gridstack sucks.
          app.appContext.config.globalProperties.emitter.emit(`changeState-${item.vc}`, item.target.id);
        });
      });
    });

    return {
      grid,
      items,
      runInteractionAnalysis,
      confidence,
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

