<template>
  <div 
    id="loom"
    :style="{
      height: currentConfig ? currentConfig.window.height + 'px' : '0px',
      width:  currentConfig ? currentConfig.window.width + loomMenuWidth + 'px' : '0px',
      outline: regionSelect ? 'dashed white' : 'none',
    }"
  >
    <!-- global list of video tags!-->
    <video 
      v-for="(val, key) in videoPlayers"
      :key="key"
      :ref="`videoPlayer${val.id}`"
      :style="{
        width:  currentConfig ? currentConfig.window.width  + 'px' : '0px',
        height: currentConfig ? currentConfig.window.height + 'px' : '0px',
      }"
      class="video-js" 
      style="position: absolute; top: 0px; left: 0px; visibility: hidden;"
    />
    <loom-video-canvas
      v-for="videoTarget in videoTargets"
      :key="videoTarget.id"
      :targetData="videoTarget"
      :regionSelect="regionSelect"
      :overlay="hintHelpState"
      :renderMode="renderMode"
      :currentConfig="currentConfig"
      :start_state_id="current_state.id"
      :dragMode="dragMode"
      @frame_processed="() => videoTarget.processed = true"
    />
    
    <div id="loom-menu" :style="loomMenuStyle">
      <span class="title">Loom</span>

      <div>
        <font-awesome-icon icon="save" class="activeInput" @click="saveVideoCanvasState"/> &nbsp;
        <font-awesome-icon icon="file" class="activeInput" @click="loadVideoCanvasState"/>
      </div>

      <span class="text">Mode</span>
      <select name="device" ref="renderMode" @change="onDeviceChange">
        <option value="desktop">Desktop</option>
        <option value="mobile">Mobile</option>
      </select>

      <span class="text">Regions:</span>
      <input 
        ref="regionToggle"
        @click="toggleRegion"
        type="checkbox"
        class="sidebar-toggle apple-switch btn btn-default"
      />

      <div v-show="regionSelect" class="grid-container">
        
        <div style="grid-area: selectMode">
          <span class="text">Select Mode</span>
          <input
            ref="SelectMode"
            @click="()=>dragMode=!dragMode"
            type="checkbox"
            class="sidebar-toggle apple-switch btn btn-default"
          />
        </div>

        <div style="grid-area: newCanvas" class='activeInput'>
          <span class="text">Canvas</span> <br>
          <font-awesome-icon icon="plus-square" style="color: white" @click="newVideoTarget"/>
        </div>
        
        <div  style="grid-area: cutRegion" :class="regionExists ? 'activeInput' : 'inactiveInput'">
          <span class="text">Region</span> <br>
          <font-awesome-icon icon="border-none"  @click="e => regionExists ? cutRegion(e) : null"/>
        </div>
        
        <div stlye='grid-area: cut' :class="currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'">
          <span class="text">Cut</span> <br>
          <font-awesome-icon icon="cut" @click="e => currVideoCanvasSelected ? cut(e) : null"/>
        </div>

        <div stlye='grid-area: copy' :class="currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'">
          <span class="text">Copy</span> <br>
          <font-awesome-icon icon="copy" @click="e => currVideoCanvasSelected ? copy(e) : null"/>
        </div>

        <div stlye='grid-area: dup' :class="currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'">
          <span class="text">Duplicate</span> <br>
          <font-awesome-icon icon="clone" @click="e => currVideoCanvasSelected ? duplicate(e) : null"/>
        </div>

        <div stlye='grid-area: resize' :class="currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'">
          <span class="text">Resize</span> <br>
          <font-awesome-icon icon="expand-arrows-alt" @click="e => currVideoCanvasSelected ? resize(e) : null"/>
        </div>
        
        <div style='grid-area: paste' :class="pasteBin ? 'activeInput' : 'inactiveInput'">
          <span class="text">Paste</span> <br>
          <font-awesome-icon icon="paste" @click="e => pasteBin ? paste(e) : null"/>
        </div>

        <div stlye='grid-area: delete' :class="currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'">
          <span class="text">Delete</span> <br>
          <font-awesome-icon icon="trash" @click="e => currVideoCanvasSelected ? Delete(e) : null"/>
        </div>

      </div>

      <span class="text">Hints:</span>
      <input 
        ref="helpToggle"
        @click="toggleHintHelp"
        type="checkbox"
        class="sidebar-toggle apple-switch btn btn-default"
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

import loomConfig from './loomConfig.json'
import transformMode from './transforms.js'
import loomVideoCanvas from './loomComponents/loomVideoCanvas.vue'
import utils from './loomComponents/utils.js'

//todo: brushing backwards in loomBrushingBox component
//todo: make more robust loom object class?
//todo: make more robust videoTarget object class?
//todo: change everything to use ids instead of frame_no's? - have separate cache for frame_no's mapping?

export default {
  name: 'Loom2',
  components: {
    loomVideoCanvas
  },

  props: {
    directory: {
      type: String,
    },
    config_filename: {
      type: String,
      default: 'config.json'
    },
    video_filename: {
      type: String,
      default: 'video.mp4'
    },
    shortcuts: {
      type: Array,
      default: [],
    }
  },

  data: () => ({
    //state
    config: null,
    renderMode: null,
    currentConfig: null,
    current_state: null,
    //targets
    targets: {},
    targetCount: 0,
    transformedTargetCache: {},
    //video
    videoTargetCache: {},
    videoPlayers: [],
    //history
    confidence: 5,
    interactionHistory: [],
    maxHistoryLength: 100,
    //app
    dragMode: true,
    loomMenuWidth: 120,
    hintHelpState: false,
    searchResults: [],
    regionSelect: false,
    regionExists: false,
    regionOrigin: null,
    currVideoCanvasSelected: null,
    pasteBin: null,
  }),

  computed: {
    styleSize: function(){
      return {
        position: 'absolute',
        top: '0px',
        left: '0px',
        width:  this.currentConfig ? this.currentConfig.window.width  + 'px' : '0px',
        height: this.currentConfig ? this.currentConfig.window.height + 'px' : '0px',
      };
    },
    loomMenuStyle: function(){
      return {
        position: 'absolute',
        width: this.loomMenuWidth,
        height: this.currentConfig ? this.currentConfig.window.height + 'px' : '0px',
        top: '0px',
        left: this.currentConfig ? this.currentConfig.window.width  + 'px' : '0px',
      };
    },

    videoTargets: function(){
      if(!this.current_state || !this.videoTargetCache[this.renderMode]) return null;
      for(let cs = this.current_state; cs; cs = utils.findByName(cs.parent, this.targets)){
        const vts = Object.entries(this.videoTargetCache[this.renderMode]);
        for(let i = 0; i < vts.length; ++i)
          if(cs.id == vts[i][0])  return vts[i][1];
      }
      console.error("No encompassing loom canvas found!");
      return null;
    }
  },

  methods: {

    setupVideo(element){

      let videoOptions = {
        sources: [{
          src: this.directory + '/' + this.video_filename,
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
    parentify(config){
      config.children.forEach(child => {
        child.parent_id = config.id;
        if(child.hasOwnProperty('children') && child.children.length > 0) this.parentify(child);
      });      
      return config;
    },
    load(){
      return fetch(this.directory + '/' + this.config_filename)
        .then(response => response.text())
        .then(config => JSON.parse(config))
        .then(config => {
          Object.keys(config).forEach(key => {
            if(key == 'version')  return;
            config[key] = this.parentify(config[key]);
          });
          return config
        }).then(config => {
          
          if(config['version'] != loomConfig['version']){
            console.error('ERROR, out of version config file, run Recorder/convert.py');
            return;
          }

          this.config = config
          this.currentConfig = this.config[this.renderMode];
          this.targetCacheModeChange(this.renderMode);
        }).then(() => {
          //TODO: save/load videoTargetModes
        });
    },

    init(mode){
      this.targetCacheModeChange(mode);
      this.targets = this.transformedTargetCache[mode];
      this.currentConfig = this.config[mode];
      this.current_state = this.targets[1];
      this.videoCacheModeChange(mode);
      this.changeState(this.current_state);
      this.drawMiniMap();
    },

    traverse(target){
      let targets = {};
      if(target.name != "root") {
        if(target.frame_no == -1) target.frame_no = 'frameless_' + this.targetCount;
        targets[target.frame_no] = target;
        ++this.targetCount;
      }
      target.hasOwnProperty('children') && target.children.forEach(child => {
        targets = {...targets, ...this.traverse(child)};
      });
      return targets;
    },

    updateInteractionHistory(target, e, videoCanvas){
      let interaction = {
        id: target.frame_no,
        videoCanvas,
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
          let vc = interaction.vc;
          this.$emit("addShortcut", {
            id: target.frame_no,
            content: target.name,
            target,
            vc,
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
          
          const {id} = this.interactionHistory[j];
          const vc = this.interactionHistory[j].videoCanvas;
          ss.push(id);
          s += '-' + String(id);

          if (m[s] == undefined) m[s] = { frames: [], n: 0, vc };

          m[s].frames = [...ss]; //clone
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
    },
    
    changeState(target, offset = 0){
      this.changeStateWithFrameNo(target.frame_no, offset);
    }, 

    changeStateWithFrameNo(frame){
      this.current_state = this.targets[frame];
      this.drawMiniMap();
    },

    drawMiniMap(){
      const canvas = this.$refs.miniMap;
      const width = this.loomMenuWidth - 20;
      const ratio = 1.0 * width / this.currentConfig.window.width;
      const height = this.currentConfig.window.height * ratio;
      const context = canvas.getContext("2d");

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      context.fillStyle = "#cccccc";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "#aaaaaa";

      Object.values(this.targets).forEach( target => {
        if((
            utils.findChild(target, this.current_state) == null &&
            utils.findSibling(target, this.current_state, this.targets) == null &&
            target.parent != 'root'
          ) || target.hide || target.shape.type != "poly"
        ) return;

        context.beginPath();
        context.moveTo(target.shape.points[0].x*ratio, target.shape.points[0].y*ratio);
        for (let j = 1; j < target.shape.points.length; j++)
          context.lineTo(target.shape.points[j].x*ratio, target.shape.points[j].y*ratio);
        context.closePath();
        context.fill();
      });
    },

    toggleHintHelp(){
      this.hintHelpState = !this.hintHelpState;
      this.$refs.regionToggle.checked = false;
      this.regionSelect = false;
    },

    toggleRegion(e){
      this.regionSelect = !this.regionSelect;
      this.$refs.helpToggle.checked = false;
      this.hintHelpState = false;
      this.$refs.SelectMode.checked = false;
      this.dragMode = true;
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
      for (let i in this.targets) 
        if (this.targets[i]["name"] == name)
          target = this.targets[i];

      if(target) {
        if(target.parent == "root") {
          this.current_state = this.currentConfig;
        } else {
          let parent = utils.findByName(target.parent, this.targets);
          this.changeStateWithFrameNo(parent.frame_no);
        }
      }

      let targetComponent = this.$refs['target'+target.id];
      if(targetComponent) targetComponent.highlight();
    },

    targetCacheModeChange(mode){
      if(!this.transformedTargetCache.hasOwnProperty(mode)){
        const configCopy = utils.deepCopy(this.currentConfig);
        if(!this.config.hasOwnProperty(mode))
          this.config[mode] = transformMode(configCopy, Object.values(this.config)[0], mode);
        this.targetCount = 0;
        this.transformedTargetCache[mode] = this.traverse(this.config[mode]);
        this.transformedTargetCache[mode][0] = this.config[mode];
      }
    },
    
    newVideoTarget(obj){
      const nvt = {
        id: this.current_state.id,
        cutouts: [],
        targets: utils.deepCopy(this.targets),
        parentCanvas: true,
        ...obj
      };
      this.videoTargetCache[this.renderMode][this.current_state.id] = [nvt];
      return nvt;
    },

    createNewVideoPlayer(id, obj={}){
      this.videoPlayers.push({id, ...obj});
    },

    videoCacheModeChange(mode){
      if(!this.videoTargetCache.hasOwnProperty(mode)){
        this.videoTargetCache[mode] = {
          '-1': [{
            id: -1,
            videoPlayerLink: '-1',
            cutouts: [],
            targets: utils.deepCopy(this.targets),
          }],
        };
        this.videoPlayers.push({id: '-1'});
      }
    },

    onDeviceChange(event){
      const mode = event.target.value;
      this.init(mode);
      this.renderMode = mode
    },
    
    saveVideoCanvasState(){
      const name = prompt("Enter name to save config as:");
      if(name == null || name == "")  return;

      const saveNames = JSON.parse(localStorage.getItem('saveNames')) || [];
      if(!saveNames.some(n => n == name)) saveNames.push(name);
      localStorage.setItem('saveNames', JSON.stringify(saveNames));

      const vts = JSON.parse(JSON.stringify(this.videoTargetCache));//utils.deepCopy(this.videoTargetCache); - maximum call stack exceeded?
      vts['current_state'] = this.current_state;
      vts['renderMode'] = this.renderMode;

      try{
        localStorage.setItem(name, JSON.stringify(vts));
      } catch (err) {
        alert("Could not save to localStorage - too large");
        console.error(err);
        //todo: file download
      }
    },

    loadVideoCanvasState(){
      let loadOptions = localStorage.getItem('saveNames');
      if(!loadOptions){
        alert("No files to load");
        //todo: file upload
        return;
      }
      loadOptions = JSON.parse(loadOptions)
      const loadName = prompt("Enter load file\n Available names: " + loadOptions.join(', '));
      if(!loadOptions.some(lo => lo == loadName)){
        alert("File does not exist");
        return;
      }
      const vts = JSON.parse(localStorage.getItem(loadName));
      
      this.renderMode = vts['renderMode'];
      this.current_state = vts['current_state'];
      delete vts['renderMode'];
      delete vts['current_state'];
      this.videoTargetCache = vts;
      this.init(this.renderMode);
    },

    Delete(){
      if(this.currVideoCanvasSelected){
        const id = this.videoTargets.findIndex(vt => vt.id == this.currVideoCanvasSelected.targetData.id);
        this.videoTargets.splice(id, 1);
      }
      this.currVideoCanvasSelected = null;
    },
    copy(){
      this.pasteBin = this.currVideoCanvasSelected.targetData;
      this.pasteBin.start_state = this.currVideoCanvasSelected.current_state;
    },
    cut(){
      this.copy();
      this.Delete();
    },
    duplicate(){
      const pasteBin = this.pasteBin;
      this.copy();
      this.paste();
      this.pasteBin = pasteBin;
    },
    resize(){
      //todo
    },
    paste(){
      if(this.pasteBin) {
        const fn = this.pasteBin.startupFn;
        const copy = JSON.parse(JSON.stringify(this.pasteBin)); //utils.deepCopy(this.pasteBin); //todo: vue complains about enumerating keys on components here
        copy.startupFn = (c) => { c.updateParentCurrentState = false; if(fn) c.fn(c);}
        copy.id = copy.id + '_copy';
        this.videoTargets.push(copy);
      }
    },

    cutRegion(){
      this.dragMode = true;
      this.$refs.SelectMode.checked = false;
      this.regionOrigin.cutSelectedRegion();

      this.drawMiniMap();
    },
  },
  mounted(){
    window.vue = this;
    this.renderMode = this.$refs.renderMode.value;
    this.load().then(() => {
      this.init(this.renderMode);
      this.emitter.on("regionExists", (e) => {
        this.regionExists = e.exists;
        this.regionOrigin = e.origin;
      });
    });
    
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

  .grid-container {
    display: grid;
    grid-template-areas:
      'selectMode selectMode'
      'newCanvas  cutRegion '
      'cut        copy      '
      'dup        des'
      'delete     paste     ';
  }

  .grid-container > div {
    text-align: center;
    font-size: 0.9em;
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

  .sidebar-toggle {
    width: 100px !important;
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

  .vjs-waiting {
    visibility: hidden;
    background: transparent;
  }
  .vjs-loading-spinner {
    display: none !important;
  } 
  .hide {
      display: none;
  }

  span.text {
    display: inline-block;
    margin-top: 20px;
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

  #miniMap {
    margin-top: 10px;
    border-radius: 5px;
  }

  .activeInput {
    color: white;
    cursor: pointer;
  }

  .inactiveInput {
    color: grey;
    cursor: default;
  }

</style>