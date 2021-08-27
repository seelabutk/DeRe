<template>
  <div 
    id="loom"
    :style="{
      height: currentConfig ? currentConfig.window.height + 'px' : '0px',
      width:  currentConfig ? currentConfig.window.width  + 'px' : '0px',
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
      :key="`${renderAppMode}-${videoTarget.id}`"
      :ref="`loomVideoCanvas-${videoTarget.id}`"
      :loomID="id"
      :targetData="videoTarget"
      :regionSelect="regionSelect"
      :overlay="overlay"
      :renderMode="renderAppMode"
      :currentConfig="currentConfig"
      :start_state_id="current_state.id"
      :dragMode="dragMode"
      @frame_processed="() => videoTarget.processed = true"
    />
  </div>
</template>

<script>
import videojs from 'video.js'
import 'video.js/dist/video-js.min.css'


import loomConfig from './loomConfig.json'
import transformMode from './transforms.js'
import loomVideoCanvas from './loomComponents/loomVideoCanvas.vue'
import utils from './loomComponents/utils.js'
// TODOs: 
// auto-generate app based on user interaction

export default {
  name: 'LoomInstance',
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
    regionSelect: {
      type: Boolean,
    }, 
    overlay: {
      type: Boolean,
    }, 
    dragMode: {
      type: Boolean,
    },
    id: {
      type: String,
    }
  },

  data: () => ({
    //state
    config: null,
    currentConfig: null,
    current_state: null,
    loaded: false,
    renderAppMode: null,
    //targets
    targets: {},
    targetCount: 0,
    transformedTargetCache: {},
    //video
    videoTargetCache: {},
    videoPlayers: [],
    //history
    interactionHistory: [],
    maxHistoryLength: 100,


    numVideoPlayers: 3,
    lastUsedVideoPlayer: 0,
    fps: 30,
  }),

  computed: {
    videoTargets: function(){
      if(!this.current_state || !this.videoTargetCache[this.renderAppMode]) return null;
      for(let cs = this.current_state; cs; cs = utils.findByName(cs.parent, this.targets)){
        if(typeof cs.frame_no === "string" && cs.frame_no.includes("frameless")){
          cs = utils.findByName(cs.parent, this.targets); //skip frameless states
        }
        const vts = Object.entries(this.videoTargetCache[this.renderAppMode]);
        for(let i = 0; i < vts.length; ++i)
          if(String(cs.id) === vts[i][0]){
            return vts[i][1];
          }
      }
      console.error("No encompassing loom canvas found!");
      return null;
    },
  },

  methods: {

    setupVideo(element){
      const p = videojs.getPlayer(element);
      if(p) return p;

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

    load(renderMode){
      if(this.loaded) return Promise.resolve();
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
          this.config = config;
          this.currentConfig = this.config.hasOwnProperty(this.renderAppMode) ? this.config[this.renderAppMode] : this.config[renderMode];
          this.loaded = true;

          this.transformedTargetCache['hidden'] = {};
          this.videoTargetCache['hidden'] = {};
        });
    },

    init(m){
      this.renderAppMode = `${m.value}_${m.renderMode}`;
      return this.load(m.renderMode).then(()=>{
        if(!m.selected){
          this.renderAppMode = 'hidden';
        }
        this.targetCacheModeChange(this.renderAppMode, m.renderMode);
        this.targets = this.transformedTargetCache[this.renderAppMode];
        this.current_state = this.targets[1];
        this.videoCacheModeChange(this.renderAppMode);
        this.changeState(this.current_state);
        this.$parent.drawMiniMap(this.current_state, this.targets);
      });
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
      this.emitter.emit("runInteractionAnalysis", this.interactionHistory);
    },
    
    changeState(target, offset = 0){
      if(target === undefined)  return;
      this.changeStateWithFrameNo(target.frame_no, offset);
    }, 

    changeStateWithFrameNo(frame){
      this.current_state = this.targets[frame];
      this.$parent.drawMiniMap(this.current_state, this.targets);
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

    targetCacheModeChange(mode, transform){
      if(!this.transformedTargetCache.hasOwnProperty(mode)){
        if(!this.config.hasOwnProperty(mode)){
          this.config[mode] = transformMode(utils.deepCopy(this.currentConfig), Object.values(this.config)[0], transform);
        }
        this.targetCount = 0;
        this.transformedTargetCache[mode] = this.traverse(this.config[mode]);
        this.transformedTargetCache[mode][0] = this.config[mode];
      }
    },
    
    newVideoTarget(obj){
      const nvt = {
        id: String(this.current_state.id),
        cutouts: [],
        targets: this.targets,
        parentCanvas: true,
        ...obj
      };
      this.videoTargetCache[this.renderAppMode][this.current_state.id] = [nvt];
      return nvt;
    },


    changeVideoFrame(videoCanvasID, frameNo, emit=true){
      const vp = this.videoPlayers[this.lastUsedVideoPlayer];
      this.lastUsedVideoPlayer = (this.lastUsedVideoPlayer+1)%this.numVideoPlayers;
      const self = this;

      new Promise((res, rej) => {
        vp.promises.push(res);
        if(!vp.inUse){
          res(res);
        }
        setTimeout(() => rej(res), 500);
      }).then(resolve => {
        const pi = vp.promises.findIndex(res => res == resolve);

        vp.player.on('timeupdate', function timeUpdate(){
          const vpEl = self.$refs[`videoPlayer${vp.id}`];
          if(!vpEl) return;

          if(self.$refs[`loomVideoCanvas-${videoCanvasID}`])
            self.$refs[`loomVideoCanvas-${videoCanvasID}`].draw(vpEl, emit);
          vp.player.off('timeupdate', timeUpdate);

          if(vp.promises[pi+1]) {
            vp.promises[pi+1](vp.promises[pi+1]);
          }
          
          vp.inUse = false;
          vp.promises.splice(pi, 1);
        });
        
        vp.inUse = true;
        vp.player.currentTime(frameNo/this.fps);
      }).catch(resolve => {
        const pi = vp.promises.findIndex(res => res == resolve);
        vp.promises.splice(pi, 1);
        console.warn("frame took too long");
      });
    },

    createNewVideoPlayer(id){
      const vp = {id, promises: []};
      this.videoPlayers.push(vp);
      this.$nextTick(()=>{
        const player = this.setupVideo(this.$refs[`videoPlayer${id}`]);
        if(player) 
          vp.player = player;
        else
          console.error("No Player!");
      });
      
    },

    videoCacheModeChange(mode){
      if(!this.videoTargetCache.hasOwnProperty(mode)){
        //create "root", -1 == root
        this.videoTargetCache[mode] = {
          '-1': [{
            id: '-1',
            cutouts: [],
            targets: this.targets,
          }],
        };
      }
    },

    Delete(videoCanvas){
      let id = null;
      if(videoCanvas === null && this.videoTargets !== null) {
        id = this.videoTargets.findIndex(vt => String(vt.id) == '-1');
      }else if(videoCanvas){
        id = this.videoTargets.findIndex(vt => String(vt.id) == videoCanvas.id);
      } 
      if(id !== null)  this.videoTargets.splice(id, 1);
    },
    paste(pasteBin){
      if(pasteBin) {
        const fn = pasteBin.startupFn;
        const copy = JSON.parse(JSON.stringify(pasteBin)); //utils.deepCopy(this.pasteBin); //TODO: vue complains about enumerating keys on components here
        copy.startupFn = (c) => { c.updateParentCurrentState = false; if(fn) c.fn(c);}
        copy.id = copy.id + '_copy';
        this.videoTargets.push(copy);
      }
    },

  },

  mounted(){
    for(let i = 0; i < this.numVideoPlayers; ++i){
      this.createNewVideoPlayer(i);
    }
  }
}
</script>

<style scoped>
  #loom {
    position: relative;
    width: 100%;
    height: 100%;
    margin: 0 auto;
  }
</style>