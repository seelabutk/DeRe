<template>
  <div 
    id="loom"
    :style="{
      height: config ? config.info.window.height + 'px' : '0px',
      width:  config ? config.info.window.width  + 'px' : '0px',
      position: 'absolute',
      'margin-left': 'auto',
      'margin-right': 'auto',
      left: 0,
      right: 0,
      'text-align': 'center',
      'pointer-events': 'none'
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
      :key="`${renderAppMode}-${videoTarget.id}-${videoTarget.page}`"
      :ref="`loomVideoCanvas-${videoTarget.id}`"
      :instanceID="id"
      :targets="targets"
      :targetData="videoTarget"
      :regionSelect="regionSelect"
      :overlay="overlay"
      :renderMode="renderMode"
      :renderAppMode="renderAppMode"
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
import utils from './utils/utils.js'
import { render } from '@vue/runtime-dom'

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
    renderMode: {
      type: String,
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
    },
    name: {
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
    maxHistoryLength: 30,


    numVideoPlayers: 3,
    lastUsedVideoPlayer: 0,
    fps: 30,
  }),

  computed: {
    targets: function(){
      const originalTargets = utils.shallowCopy(this.transformedTargetCache['original']);
      delete originalTargets.mode;
      const newTargets = utils.shallowCopy(this.transformedTargetCache[this.renderAppMode] || {});
      delete newTargets.mode;
      const mergedTargets = utils.deepMerge(originalTargets, newTargets);
      return mergedTargets;
    },
    videoTargets: function(){
      if(!this.current_state || !this.videoTargetCache[this.renderAppMode]) return null;
      let vt = null
      
      for(let cs = this.current_state; vt === null && cs && cs.id != cs.parent_id; cs = this.targets[cs.parent_id]){
        if(typeof cs.frame_no === "string" && cs.frame_no.includes("frameless")) continue;

        const vts = Object.entries(this.videoTargetCache[this.renderAppMode]);
        for(let i = 0; i < vts.length; ++i){
          if(String(cs.id) === vts[i][0]){
            vt = vts[i][1];
            break;
          }
        }

      }
      if(vt === null){
        vt = this.videoTargetCache[this.renderAppMode]['-1'];   //return root
      }
      return vt;
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
        this.init_videoTargetCache(vtc, m.value, m.renderMode);
        this.videoCacheModeChange(this.renderAppMode);

        this.current_state = Object.values(this.targets).filter(t => t.frame_no > 0).sort((a,b) => a.frame_no - b.frame_no)[0];
        this.changeState(this.current_state.id);
      });
    },

    init_videoTargetCache(cvt_config, renderAppMode, renderMode){
      const rarm = `${renderAppMode}_${renderMode}`
      if(!cvt_config || cvt_config[rarm] === undefined) return;

      //this.$nextTick(() => {
        const vt_config = cvt_config[rarm]
        const val = utils.deepCopy(vt_config);
        for(const page of Object.values(val)){
          for(const vc of Object.values(page)){
            vc.processed = vc.processed === undefined ? Boolean(vc.cutouts && vc.cutouts.length > 0) : vc.processed;
            vc.cutouts = vc.cutouts || [];
            
            const instance = renderAppMode
            const lfs = vc.linkedFrames || [];
            for(const lf of lfs){
              if(lf.mode != renderMode)
                continue;

              const ld = {
                mode: renderMode,
                instance: instance,
                page: vc.page,
                vcid: vc.id,
              };
              if(lf.instance == ld.instance){
                const linkFromName = `${ld.instance}-${ld.vcid}-all`;
                const linkToName   = `${lf.instance}-${lf.vcid}-all`;
                if(!this.$parent.linkData.linkedCanvases.exists(linkFromName))  this.$parent.linkData.linkedCanvases.add(linkFromName, ld);
                if(!this.$parent.linkData.linkedCanvases.exists(linkToName  ))  this.$parent.linkData.linkedCanvases.add(linkToName  , lf);
                this.$parent.linkData.linkedCanvases.merge(linkFromName, linkToName);
              } else {
                for(const frame of lf.frames){
                  ld.frame = frame[0];
                  lf.frame = frame[1];
                  const linkFromName = `${ld.instance}-${ld.vcid}-${ld.frame}`;
                  const linkToName   = `${lf.instance}-${lf.vcid}-${lf.frame}`;
                  if(!this.$parent.linkData.linkedCanvases.exists(linkFromName))  this.$parent.linkData.linkedCanvases.add(linkFromName, ld);
                  if(!this.$parent.linkData.linkedCanvases.exists(linkToName  ))  this.$parent.linkData.linkedCanvases.add(linkToName  , lf);
                  this.$parent.linkData.linkedCanvases.merge(linkFromName, linkToName);
                }
              }
            }


            if(vc.parentCanvas && vc.parentCanvas != '-1'){
              const pc = this.$refs[`loomVideoCanvas-${vc.parentCanvas}`];
              if(vc.makeCutout && pc){
                pc.targetData.cutouts = vc.parentCanvas.cutouts || [];

                const region = vc.region;
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
                  id: vc.id
                });
              }
            }
          }
        }

        for(let key in vt_config){
          this.videoTargetCache[rarm][key] = vt_config[key];
        }
      //});
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

    addInstanceLink(fl, ld){
      const fli = this.$parent.$refs[fl.instance].renderAppMode;
      if(this.videoTargetCache[fli][fl.page][fl.vcid].linkedFrames == undefined)
        this.videoTargetCache[fli][fl.page][fl.vcid].linkedFrames = [];
      const linkedFrames = this.videoTargetCache[fli][fl.page][fl.vcid].linkedFrames;

      const lf = linkedFrames.find(lf => lf.mode == cld.mode && lf.page == cld.page && lf.vcid == cld.vcid);
      if(lf != undefined){
        lf.frames = lf.frames || [];
        lf.frames.push([fl.frame, ld.frame])
      } else {
        const cld = {...ld} //shallow copy
        if(fl.instance != ld.instance){
          delete cld.frame;
          cld.frames = [[fl.frame, ld.frame]];
        }
        linkedFrames.push(cld)
      }
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

      let page = '-1';
      if(!this.videoTargetCache.hasOwnProperty(mode)){
        this.videoTargetCache[mode] = {};
      }else{
        page = String(this.current_state.id);
      }

      const region = utils.rectToPoly({
        x: 0, y: 0,
        width: this.config.info.window.width, 
        height: this.config.info.window.height,
      });

      if(!this.videoTargetCache[mode][page] || clear)
        this.videoTargetCache[mode][page] = {};

      const id = String(Object.keys(this.videoTargetCache[mode][page]).length);
      this.videoTargetCache[mode][page][id] = {
        page,
        id,
        region,
        top: 0,
        left: 0,
        makeCutout: false,
        parentCanvas: false,
        cutouts: [],
        startupFn: null,
        processed: true,
        ...obj //to overwrite preceding values
      };
      return this.videoTargetCache[mode][page][id];
    },


    changeVideoFrame(page, videoCanvasID, frameNo, emit=true){
      if(!frameNo && frameNo !== 0) return
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
        const copy = utils.deepCopy(pasteBin);
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