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
import loomVideoCanvas from './loomVideoCanvas.vue'
import utils from './loomComponents/utils.js'

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
    videoTargetCache: {
      type: Object,
      default: {}
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
    targetCount: 0,
    transformedTargetCache: {},
    //video
    videoPlayers: [],
    //history
    interactionHistory: [],
    maxHistoryLength: 100,


    numVideoPlayers: 3,
    lastUsedVideoPlayer: 0,
    fps: 30,
  }),

  computed: {
    targets: function(){
      const originalTargets = utils.shallowCopy(this.transformedTargetCache['original']);
      delete originalTargets.mode;
      const newTargets = utils.shallowCopy(this.transformedTargetCache[this.renderAppMode]);
      delete newTargets.mode;
      const mergedTargets = utils.deepMerge(originalTargets, newTargets);
      return mergedTargets;
    },
    videoTargets: function(){
      if(!this.current_state || !this.videoTargetCache[this.renderAppMode]) return null;

      for(let cs = this.current_state; cs; cs = this.targets[cs.parent_id]){
        if(typeof cs.frame_no === "string" && cs.frame_no.includes("frameless")) continue;

        const vts = Object.entries(this.videoTargetCache[this.renderAppMode]);
        for(let i = 0; i < vts.length; ++i){
          if(String(cs.id) === vts[i][0]){
            return vts[i][1];
          }
        }
      }
      return this.videoTargetCache[this.renderAppMode]['-1'];   //return root
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
      Object.values(config.children).forEach(child => {
        child.parent_id = config.id;
        if(child.hasOwnProperty('children') && Object.keys(child.children).length > 0) this.parentify(child);
      });      
      return config;
    },

    load(){
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
          this.currentConfig = this.config.hasOwnProperty(this.renderAppMode) ? this.config[this.renderAppMode] : this.config['original'];
          this.loaded = true;

          this.transformedTargetCache['hidden'] = {};
          this.videoTargetCache['hidden'] = {};

          this.transformedTargetCache['original'] = this.traverse(this.config['original']);
          this.targetCount = 0;
        });
    },

    init(m){
      this.renderAppMode = `${m.value}_${m.renderMode}`;
      return this.load().then(()=>{
        if(!m.selected){
          this.renderAppMode = 'hidden';
        }
        this.targetCacheModeChange(this.renderAppMode, m.renderMode);
        this.current_state = Object.values(this.targets).filter(t => t.frame_no > 0).sort((a,b) => a.frame_no - b.frame_no)[0];
        this.videoCacheModeChange(this.renderAppMode);
        this.changeState(this.current_state.id);
      });
    },

    traverse(config){
      const self = this;
      const flatTargets = (function traverse_recurse(target){
        let targets = {};
        if(target.name && target.name != "root") {
          if(target.frame_no == -1) target.frame_no = `frameless_${this.targetCount}`;
          targets[target.id] = target;
          ++self.targetCount;
        }
        if(target.hasOwnProperty('children')){
          Object.values(target.children).forEach(child => {
            targets = {...targets, ...traverse_recurse(child)};
          });
          const newChildren = {};
          Object.values(target.children).map(c => c.id).forEach(id => {
            newChildren[id] = {};
          });
          target.children = newChildren;
        }
        return targets;
      })(config);

      flatTargets['mode'] = config.mode;
      flatTargets['-1'] = { children: {}, frame_no: -1, id: '-1' };
      Object.keys(config.children).forEach(child => {
        flatTargets['-1'].children[child] = {};
      })
      return flatTargets;
    },

    updateInteractionHistory(target, e, videoCanvas){
      let interaction = {
        id: target.id,
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
    
    changeState(target_id, offset = 0){
      const target = this.targets[target_id];
      if(target === undefined)  {
        console.error("Invalid state");  
        return;
      }
      this.changeStateWithFrameNo(target.frame_no, offset);
    }, 

    changeStateWithFrameNo(frame){
      this.current_state = Object.values(this.targets).find(o => o.frame_no == frame);
    },

    targetCacheModeChange(mode, transform){
      if(!this.transformedTargetCache.hasOwnProperty(mode)){
        if(!this.config.hasOwnProperty(mode)){
          this.transformedTargetCache[mode] = transformMode(this.transformedTargetCache['original'], transform);
        } else {
          this.transformedTargetCache[mode] = this.traverse(this.config[mode]);
        }
      }
    },
    
    newVideoTarget(obj={}, mode=undefined){
      if(mode === undefined)  mode = this.renderAppMode;

      let id;
      if(!this.videoTargetCache.hasOwnProperty(mode)){
        id = '-1';
        this.videoTargetCache[mode] = {};
      }else{
        id = String(this.current_state.id);
      }

      const region = utils.rectToPoly({
        x: 0, y: 0,
        width: this.currentConfig.window.width, 
        height: this.currentConfig.window.height,
      });

      this.videoTargetCache[mode][id] = [{
        id,
        region,
        top: 0,
        left: 0,
        makeCutout: true,
        parentCanvas: true,
        cutouts: [],
        targets: this.targets,
        startupFn: null,
        processed: true,
        ...obj //to overwrite preceding values
      }];
      return this.videoTargetCache[mode][id];
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
        setTimeout(() => rej(res), 1000);
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
        //todo: retry?
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
        this.newVideoTarget({
          parentCanvas: false,
          processed: false,
        }, mode);
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