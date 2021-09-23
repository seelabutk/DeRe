<template>
  <div 
    id="loom"
    :style="{
      height: config ? config.info.window.height + 'px' : '0px',
      width:  config ? config.info.window.width  + 'px' : '0px',
      outline: regionSelect ? 'dashed white' : 'none',
    }"
  >
    <!-- global list of video tags!-->
    <video 
      v-for="(val, key) in videoPlayers"
      :key="key"
      :ref="`videoPlayer${val.id}`"
      :style="{
        width:  config ? config.info.window.width  + 'px' : '0px',
        height: config ? config.info.window.height + 'px' : '0px',
      }"
      class="video-js" 
      style="position: absolute; top: 0px; left: 0px; visibility: hidden;"
    />
    <loom-video-canvas
      v-for="videoTarget in videoTargets"
      :key="`${renderAppMode}-${videoTarget.id}`"
      :ref="`loomVideoCanvas-${videoTarget.id}`"
      :loomID="id"
      :targets="targets"
      :targetData="videoTarget"
      :regionSelect="regionSelect"
      :overlay="overlay"
      :renderMode="renderAppMode"
      :currentConfig="currentConfig"
      :info="config.info"
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
    vtc_filename: {
      type: String,
      default: 'vtc.json'
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

      for(let cs = this.current_state; cs && cs.id != cs.parent_id; cs = this.targets[cs.parent_id]){
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

    load(){
      if(this.loaded) return Promise.resolve([this.config, this.$parent.appConfig]);
      return Promise.all([
          fetch(this.directory + '/' + this.config_filename).then(res => res.text()).then(config => JSON.parse(config)),
          fetch(this.directory + '/' + this.vtc_filename)   .then(res => res.text()).then(vtc    => JSON.parse(vtc   )).catch(e => null)
        ]).then(([config, vtc]) => {
          if(config.info['version'] != loomConfig['version']){
            console.error('ERROR, out of version config file, run Recorder/convert.py');
            return;
          }

          this.config = config;
          this.currentConfig = this.config.hasOwnProperty(this.renderAppMode) ? this.config[this.renderAppMode] : this.config['original'];
          this.loaded = true;

          this.transformedTargetCache['hidden'] = {};
          this.videoTargetCache['hidden'] = {};

          this.transformedTargetCache['original'] = this.config['original'].data;

          return [config, vtc];
        });
    },

    init(m){
      this.renderAppMode = `${m.value}_${m.renderMode}`;
      this.load().then(([config, vtc])=>{
        if(!m.selected){
          this.renderAppMode = 'hidden';
        }
        this.targetCacheModeChange(this.renderAppMode, m.renderMode);
        this.current_state = Object.values(this.targets).filter(t => t.frame_no > 0).sort((a,b) => a.frame_no - b.frame_no)[0];
        this.init_videoTargetCache(vtc);
        this.videoCacheModeChange(this.renderAppMode);
        this.changeState(this.current_state.id);
      });
    },

    init_videoTargetCache(cvt_config){
      if(!cvt_config) return;
      const vt_config = utils.deepCopy(cvt_config);
      for(let mode of Object.values(vt_config)){
        for(let page of Object.values(mode)){
          for(let window of Object.values(page)){
            window.cutouts = window.cutouts || [];
            window.processed = true;
            if(window.parentCanvas){
              this.$nextTick(() => {
                const pc = this.$refs[`loomVideoCanvas-${window.parentCanvas}`];
                if(window.makeCutout && pc){
                  pc.targetData.cutouts = window.parentCanvas.cutouts || [];

                  const region = window.region;
                  const minX = Math.min(...region.map(p => p.x));
                  const maxX = Math.max(...region.map(p => p.x));
                  const minY = Math.min(...region.map(p => p.y));
                  const maxY = Math.max(...region.map(p => p.y));

                  const pcutouts = pc.targetData.cutouts;
                  pcutouts.push({
                    poly: utils.polyToPolyString(region, 0, 0),
                    width: maxX-minX,
                    height: maxY-minY,
                    top: minY,
                    left: minX,
                    id: window.id
                  });
                }
              });
            }
          }
        }
      }

      for(let key in vt_config){
        this.videoTargetCache[key] = vt_config[key];
      }
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
          this.config[mode] = transformMode(this.config, this.transformedTargetCache['original'], transform);
        } 
        this.transformedTargetCache[mode] = this.config[mode].data || {};
      }
    },
    
    newVideoTarget(obj={}, mode=undefined, clear=false){
      if(mode === undefined)  mode = this.renderAppMode;

      let id = '-1';
      if(!this.videoTargetCache.hasOwnProperty(mode)){
        this.videoTargetCache[mode] = {};
      }else{
        id = String(this.current_state.id);
      }

      const region = utils.rectToPoly({
        x: 0, y: 0,
        width: this.config.info.window.width, 
        height: this.config.info.window.height,
      });

      if(!this.videoTargetCache[mode][id] || clear)
        this.videoTargetCache[mode][id] = {};

      const len = Object.keys(this.videoTargetCache[mode][id]).length;
      this.videoTargetCache[mode][id][len] = {
        id,
        region,
        top: 0,
        left: 0,
        makeCutout: true,
        parentCanvas: true,
        cutouts: [],
        startupFn: null,
        processed: true,
        ...obj //to overwrite preceding values
      };
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
        id = '-1';
      }else if(videoCanvas){
        id = videoCanvas.id;
      } 
      if(id !== null)  delete this.videoTargets[id];
    },

    paste(pasteBin){
      if(pasteBin) {
        const fn = pasteBin.startupFn;
        const copy = JSON.parse(JSON.stringify(pasteBin)); //utils.deepCopy(this.pasteBin); //TODO: vue complains about enumerating keys on components here
        copy.startupFn = (c) => { c.updateParentCurrentState = false; if(fn) fn(c);}
        copy.id = copy.id + '_copy';
        this.videoTargets[copy.id] = copy
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