<template>
  <div 
    id="loom"
    :style="{
      height: config ? config.window.height + 'px' : '0px',
      width:  config ? config.window.width + loomMenuWidth + 'px' : '0px',
    }"
  >

    <video 
      ref="videoPlayer" 
      class="video-js" 
      :style="styleSize"
    />

    <div 
      ref="overlay" 
      id="overlay" 
      :style="styleSize" 
      :class="{'hide': !hintHelpState}"
    />

    <loomTarget 
      v-for="target in currentTargets"
      :key="target.id" 
      :ref="'target' + target.id"
      :targetData="target"
      :showHint="hintHelpState"
      @change-state="changeState"
      @add-history="updateInteractionHistory"
    />
    

    <div id="loom-menu" :style="loomMenuStyle">

      <span class="title">Loom</span>
      <span class="text">Hints:</span>
      <input 
        @click="toggleHintHelp"
        type="checkbox"
        class="apple-switch btn btn-default"
        id="hint-helper"
      />
      <canvas 
        ref="miniMap" 
        id="miniMap"
      />
      <input 
        @input="inputSearch"
        type="text" 
        class="form-control input-search" 
        placeholder="Search"
      />

      <table class="table-striped search-results-table">
        <thead>
        <tr>
          <th>State</th>
        </tr>
        </thead>
        <tbody>
          <tr 
            v-for="r in searchResults"
            :key="r.item.id"
          >
            <td @click="highlightTarget">{{r.item.name}}</td>
          </tr>
        </tbody>
      </table>

    </div>

  </div>
</template>

<script>
import videojs from 'video.js'
import 'video.js/dist/video-js.min.css'
import Fuse from 'fuse.js'
import loomTarget from './loomTarget.vue'

//todo: make custom video test all actors/types one by one
//todo: brushing backwards
//what is linear? what is parallel? 

export default {
  name: 'Loom2',
  components: {
    loomTarget,
  },
  props: {
    config_filename: {
      type: String,
      default: '/apps/test/config.json'
    },
    video_filename: {
      type: String,
      default: '/apps/test/video.mp4'
    },
    shortcuts: {
      type: Array,
      default: {},
    }
  },

  data: () => ({
    player: null,
    config: null,
    current_state: null,
    targets: {},
    interactionHistory: [],
    maxHistoryLength: 100,
    fps: 30,
    lastFrame: 0,
    loomMenuWidth: 120,
    hintHelpState: false,
    searchResults: [],
    confidence: 5,
  }),

  computed: {
    styleSize: function(){
      return {
        position: 'absolute',
        top: '0px',
        left: '0px',
        width:  this.config ? this.config.window.width  + 'px' : '0px',
        height: this.config ? this.config.window.height + 'px' : '0px',
      };
    },
    loomMenuStyle: function(){
      return {
        position: 'absolute',
        width: this.loomMenuWidth,
        height: this.config ? this.config.window.height + 'px' : '0px',
        top: '0px',
        left: this.config ? this.config.window.width  + 'px' : '0px',
      };
    },
    currentTargets: function(){
      return Object.values(this.targets).filter(target => 
        !(this.findChild(target, this.current_state) == null &&
        this.findSibling(target, this.current_state) == null &&
        target.parent != "root")
      );
    },
  },

  methods: {

    setupVideo(element){
      let self = this;
      let videoOptions = {
        sources: [{
          src: this.video_filename,
          type: 'video/mp4',
        }],
        controls: false,
        loadingSpinner: false,
        controlBar: false,
      };
      return videojs(element, videoOptions, function() {  
        this.on("click", function(ev) {
            ev.preventDefault();
        });
      });
    },

    load(){
        return fetch(this.config_filename)
            .then(response => response.text())
            .then(config => JSON.parse(config))
            .then(config => this.init(config));
    },

    init(config){
      this.config = config;
      this.current_state = this.config;
      this.traverse(this.config);
      this.drawMiniMap();
    },

    traverse(target){
      if(target.name != "root") this.targets[target.frame_no] = target;
      target.hasOwnProperty('children') && target.children.forEach(child => {
        this.traverse(child);
      });
    },

    updateInteractionHistory(target, e){
      let interaction = {
        id: target.frame_no,
        target,
        event: e,
      }
      this.interactionHistory.push(interaction);
      if(this.interactionHistory.length > this.maxHistoryLength){
        this.interactionHistory.shift();
      }
      this.runInteractionAnalysis();
    },

    runInteractionAnalysis(){
      let {order, interactions} = this.calcMostFrequentInteractions();
      order = order.filter(k => interactions[k].frames.length > 1); //filter out all single-buttons
      order = order.filter((k, i) => {
        let lastFrame = interactions[k].frames[interactions[k].frames.length-1];
        return !order.slice(0, i).some((e)=> lastFrame == interactions[e].frames[interactions[e].frames.length-1]);
      }); //filter out all interactions that end with the same frame (same result)
      order = order.filter(k => {
        let lastFrame = interactions[k].frames[interactions[k].frames.length-1];
        return !this.shortcuts.some(s => lastFrame == s.id);
      }); //filter out previously added elements      

      for(let i=0, j=0; i < order.length && j < 30; ++i){ //choose 30 most relevant elements
        let interaction = interactions[order[i]];

        if(interaction.n >= this.confidence){ //confidence of at least 5 occurrences
          ++j;
          let frame = interaction.frames[interaction.frames.length-1];
          let target = this.targets[frame];
          //todo: remove from order, add to permanent memory, add element
           this.shortcuts.push({
             id: target.frame_no,
             content: target.name,
             target,
           });
        }
      }
    },
    calcMostFrequentInteractions(){
      let n = this.interactionHistory.length;
      let m = {};

      for(let i = 0; i < n; ++i){
        let ss = [];
        let s = '';
        for(let j = i; j < n; ++j){
          
          let {id} = this.interactionHistory[j];
          ss.push(id);
          s += '-' + String(id);

          if (m[s] == undefined) m[s] = { frames: [], n: 0 };

          m[s].frames = [...ss]; //clone
          m[s].n++;
        }
      }

      let ids = Object.keys(m);
      ids.sort((a,b) => {
        if(m[a].n > m[b].n)  return -1;
        else if (m[a].n == m[b].n && m[a].frames.length > m[b].frames.length) return -1;
        else return 1;
      });

      return {
        order: ids,
        interactions: m,
      };
    },
    
    changeState(target, offset = 0){
        this.changeStateWithFrameNo(target.frame_no, offset);
    }, 

    changeStateWithFrameNo(frame, offset = 0){
        // console.log("Frame", frame);

        let target = this.targets[frame];
        if ( this.findChild(target, this.current_state) != null ||
          this.findSibling(target, this.current_state) != null ||
          this.findChild(target, this.config) != null ||
          target.name == "root"
        ) {
          this.current_state = target;
          let actualFrame = frame + 1 + offset;
          if(this.lastFrame != actualFrame) {
            this.player.currentTime((frame + 1 + offset) / this.fps);
            this.lastFrame = actualFrame;
          }
        }
        this.drawMiniMap();
    },

    drawMiniMap(){
      let canvas = this.$refs.miniMap;
      let width = this.loomMenuWidth - 20;
      let ratio = 1.0 * width / this.config.window.width;
      let height = this.config.window.height * ratio;

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      let context = canvas.getContext("2d");
      context.fillStyle = "#cccccc";
      context.fillRect(0, 0, width, height);

      context.fillStyle = "#aaaaaa";
      for (var i in this.targets){
        var target = this.targets[i];
        
        if (this.findChild(target, this.current_state) == null &&
          this.findSibling(target, this.current_state) == null &&
          target.parent != "root")  continue;

        if (target.shape.type == "rect") {
          context.fillRect(
            target.shape.x * ratio, 
            target.shape.y * ratio, 
            target.shape.width * ratio, 
            target.shape.height * ratio
          );
        }

        if (target.shape.type == "circ") {
          context.beginPath();
          context.arc(target.shape.centerX * ratio, 
            target.shape.centerY * ratio, 
            target.shape.radius * ratio,
            0, 
            2 * Math.PI);
          context.fill();
        }

        if (target.shape.type == "poly"){
          context.beginPath();
          context.moveTo(target.shape.points[0].x * ratio, target.shape.points[0].y * ratio);
          for (var j = 1; j < target.shape.points.length; j++)  {
            context.lineTo(target.shape.points[j].x * ratio, target.shape.points[j].y * ratio);
          }
          context.closePath();
          context.fill();
        }
      }
    },

    findByName(name){
      for (var i in this.targets)
        if (this.targets[i].name == name)
          return this.targets[i];
      return null;
    },

    // tries to find a target state in the immediate children of another based on its frame number
    findChild(needle, haystack){
        if (!haystack.hasOwnProperty("children")) return null; // then it's a leaf node
        for (var i = 0; i < haystack.children.length; i++)
          if (haystack.children[i].frame_no == needle.frame_no) 
            return haystack.children[i];
        return null;
    },

    // tries to find a target state (needle) in the siblings of another (other) based on its frame number
    findSibling(needle, other){
        let par = (other.parent == "root" ? this.config : this.findByName(other.parent)); 
        if (par == null || !par.hasOwnProperty("children")) return null;
        for (var i = 0; i < par.children.length; i++)
          if (par.children[i].frame_no == needle.frame_no)
            return par.children[i];
        return null;
    },

    toggleHintHelp(){
      this.hintHelpState = !this.hintHelpState;
    },

    inputSearch(e){
      let term = e.target.value;
      let options = {
        shouldSort: true,
        tokenize: true,
        threshold: 0.3,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [
          "description",
          "name"
        ],
      };

      let results = [];
      for (let i in this.targets){
        let result = (new Fuse([this.targets[i]], options)).search(term); 
        if (Object.keys(result).length > 0)
          results.push(result[Object.keys(result)[0]]);
      }
      this.searchResults = results;
    },


    highlightTarget(e){
      let name = e.target.innerHTML;
      let target = null;
      for (var i in this.targets) 
        if (this.targets[i]["name"] == name)
          target = this.targets[i];

      if(target) {
        if(target.parent == "root") {
          this.current_state = this.config;
          this.player.currentTime(1/this.fps);
        } else {
          let parent = this.findByName(target.parent);
          this.changeStateWithFrameNo(parent.frame_no);
        }
      }

      let targetComponent = this.$refs['target'+target.id];
      if(targetComponent) targetComponent.highlight();
    },

  },
  created(){
    window.vue = this;
    this.load().then(() => {
      this.current_state = this.targets[1];
      this.changeState(this.current_state);
    });
    this.emitter.on("changeState", this.changeState);
  },
  mounted(){
    this.player = this.setupVideo(this.$refs.videoPlayer);
  },
  beforeUnmount(){
    if (this.player) this.player.dispose();
  },
}
</script>

<style scoped>
  #loom {
    position: relative;
    width: 100%;
    height: 100%;
    margin: 0 auto;
  }

  #videoPlayer {
    display: inline-block;
  }

  body {
    margin: 0;
  }

  #loom-menu {
    border-radius: 0 10px 10px 0;
    background-color: rgb(45,45,45);
    width: 120px;
    height: 100%; 
    z-index: 10000;
    position: absolute;
    text-align: center;
  }

  table tr:last-child th:first-child {
    border-radius: 5px 5px 0 0;
  }

  table tr:last-child td:last-child {
    border-radius: 0 0 5px 5px;
  }

  table td {
    cursor: pointer;
  }

  .search-results-table {
    width: 100px;
    margin: 10px auto;
  }

  .input-search {
    width: 100px;  
    margin: 0 auto;
    margin-top: 10px;
    height: 20px;
  }

  #hint-helper {
    width: 100px;
    margin: 0 auto;
    display: inherit;
  }

  .title {
    font-family: Helvetica, Tahoma, Arial;
    font-size: 12px;
    color: #eee;
    display: inline-block;
    padding: 5px 0;
    text-align: center;
    width: 100%;
    border-bottom: 1px solid #ccc;
    margin-bottom: 10px;
  }

  .highlight {
    fill: rgba(246, 230, 80, 0.7);
    stroke: rgba(250, 240, 80, 0.8);
  }

  div.highlight {
    background-color: rgba(246, 230, 80, 0.7);
    border: 1px solid rgba(250, 240, 80, 0.8);
  }

  #overlay {
    background-color: rgba(0, 0, 0, 0.5);
  }

  .vjs-waiting {
    visibility: hidden;
    background: transparent;
  }
  .vjs-loading-spinner {
    display: none !important;
  } 
  .hide{
      display: none;
  }

  span.text{
    display: inline-block;
    margin-right: 10px;
    vertical-align: middle;
    color: #eee;
  }

  input.apple-switch {
    position: relative;
    -webkit-appearance: none;
    outline: none;
    width: 50px;
    height: 30px;
    background-color: #fff;
    border: 1px solid #D9DADC;
    border-radius: 50px;
    box-shadow: inset -20px 0 0 0 #fff;
    display: inline-block;
    transition: all .2s linear 0s;
  }

  input.apple-switch:after {
    content: "";
    position: absolute;
    top: 1px;
    left: 1px;
    background: transparent;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    box-shadow: 2px 4px 6px rgba(0,0,0,0.2);
    transition: all .2s linear 0s;
  }

  input.apple-switch:checked {
    box-shadow: inset 20px 0 0 0 #4ed164;
    border-color: #4ed164;
  }

  input.apple-switch:checked:after {
    left: 20px;
    box-shadow: -2px 4px 3px rgba(0,0,0,0.05);
  }

  #miniMap
  {
    margin-top: 10px;
    border-radius: 5px;
  }

</style>