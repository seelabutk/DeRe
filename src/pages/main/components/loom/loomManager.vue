<template>
  <div ref="managerRef">
    <div style="position: relative">
      <loom-instance
        v-for="(app, key) in appModes"
        :key="String(key)"
        :id="app.value"
        :ref="el => { if(el) appRefs[app.value] = el }"
        :name="app.value"
        :directory="app.directory"
        :videoTargetCache="appConfig"
        :moveRegionMode="moveRegionMode"
        :editRegionMode="editRegionMode"
        :frameLinkMode="frameLinkMode"
        :overlay="hintMode"
        :renderMode="renderMode"
      />
    </div>
  </div>
</template>

<script>
import loomInstance from './loomInstance.vue'
import DSet from './utils/disjointset.js'
import utils from './utils/utils.js'
import * as zip from '@zip.js/zip.js'
import { ref, reactive, onMounted, computed, provide, inject, nextTick } from 'vue'

zip.configure({
  useWebWorkers: false
});

export default {
  components: { loomInstance },
  props: ['directory', 'modifier_directory'],
  
  setup(props, context){
    const emitter = inject("emitter");
    //globals
    const managerRef = ref(null);

    /*******Loom Menu********/
    const moveRegionMode = ref(false);
    const editRegionMode = ref(false);
    const frameLinkMode = ref(false);
    const hintMode = ref(false);
    const regionExists = ref(false);
    const regionOrigin = ref(null);
    const pasteBin = ref(null);  
    const onAppModeChange = (v) => {
      appMode.value = v;
      init();
    };
    const Up = () => { if(appRefs[currVideoCanvasSelected.value.instanceID]) appRefs[currVideoCanvasSelected.value.instanceID].Up(currVideoCanvasSelected.value); }
    const Down = () => { if(appRefs[currVideoCanvasSelected.value.instanceID]) appRefs[currVideoCanvasSelected.value.instanceID].Down(currVideoCanvasSelected.value); }
    const Delete = () => { if(appRefs[currVideoCanvasSelected.value.instanceID]) appRefs[currVideoCanvasSelected.value.instanceID].Delete(currVideoCanvasSelected.value); };
    const copy = () => { pasteBin.value = currVideoCanvasSelected.value; };
    const cut = () => { copy(); Delete(); };
    const duplicate = () => { const pasteBinCopy = pasteBin.value; copy(); paste(); pasteBin.value = pasteBinCopy; };
    const paste = () => {
      if(appRefs[pasteBin.value.instanceID]){
        const targetData = utils.deepCopy(pasteBin.value.targetData);
        targetData.makeCutout = false;
        appRefs[pasteBin.value.instanceID].paste(targetData);
      }
    };


    /*****Saving/Loading*******/
    const saveVideoCanvasState = () => {
      let dflt = 'None';
      if(appConfig.value['startState'] && appConfig.value['startState'].saveName)
        dflt = appConfig.value['startState'].saveName;
      let name = prompt(`Enter name to save config as: (default: ${dflt})`);

      if(!name){
        if(!dflt || dflt == 'None')  return;
        name = dflt;
      }
      const saveNames = new Set(JSON.parse(localStorage.getItem('saveNames'))) || new Set();
      if(saveNames.has(name)){
        if(!confirm("Name already taken"))
          return;
      }
      saveNames.add(name);
      appConfig.value['startState'] = {
        saveName: name,
        appMode: appMode.value,
        // current_state: current_state.value,
      };
      nextTick(() => {
        try{
          localStorage.setItem('saveNames', JSON.stringify([...saveNames]));
          localStorage.setItem(name, JSON.stringify(appConfig.value));
          //todo: offer file download
        } catch (err) {
          alert(`Could not save to localStorage: ${String(err)}`);
          console.error(err);
          //todo: offer file download
        }
      });
    };
    const loadVideoCanvasState = (loadName) => {
      if(modifierFiles.value === null)  return false;
      let loadOptions = new Set(modifierFileNames.value.map(v => v.split('.')[0]));
      let localOptions = localStorage.getItem('saveNames');
      if(localOptions){
        localOptions = JSON.parse(localOptions);
        localOptions.forEach(option => loadOptions.add(option));
      }
      
      if(!loadOptions){
        alert("No files to load");
        return false;
      }

      loadOptions = Array.from(loadOptions);

      function activate(ac){
        appConfig.value = ac;
        if(appConfig.value['startState'] && appConfig.value['startState']['appMode']){
          const am = appConfig.value['startState']['appMode'];
          am.forEach(app => {
            const appLoc = props.directory + '/' + app;
            const appName = appLoc.split('/').filter(t => t != '').slice(-1)[0].replaceAll(' ', '_');
            appModes.push({
              directory: appLoc,
              label: (appName.charAt(0).toUpperCase() + appName.slice(1)),
              minLabel: (appName.charAt(0).toUpperCase() + appName.slice(1)).substr(0,4) + '...',
              value: appName,
            });
          });
          renderMode.value = 'desktop';
          appMode.value = am.map(v => v.split().join('_'));
        }
        nextTick(init);
      }

      if(loadName === undefined){
        loadName = prompt("Enter file (blank to upload)\n Available names: " + loadOptions.join(', '));
      }
      if(loadName === ''){
        selectFile().then(f => {
          const reader = new FileReader();
          reader.onload = (e) => { 
            activate(JSON.parse(e.target.result));
            saveVideoCanvasState(); 
          }
          reader.readAsText(f);
        });
      } else if(!loadOptions.some(lo => lo == loadName)){
        alert("File does not exist");
        return false;
      } else {
        const index = loadOptions.indexOf(loadName);
        const file = modifierFiles.value[index];
        if(file)  activate(file);
        else      activate(JSON.parse(localStorage.getItem(loadName)));
        return true;
      }
    };
    function selectFile (){
      return new Promise(resolve => {
          let input = document.createElement('input');
          input.type = 'file';
          input.onchange = _ => {
              let files = Array.from(input.files);
              resolve(files[0]);
          };
          input.click();
      });
    }


    /*********Components*********/
    const activeComponents = ref([]);
    const addComponent = ([name, component]) => { activeComponents.value[name] = component };
    const removeComponent = (name) => { delete activeComponents[name]; };
    const componentClicked = (e) => { return utils.getComponentFromPoint(manager, e.x, e.y); };


    /*********Video Canvas*********/
    const currVideoCanvasSelected = ref(null);
    const linkedCanvases = ref(new DSet());

    const newVideoTarget = async (obj=null, mode=undefined, clear=true) => {
      if(appRefs[currVideoCanvasSelected.value.instanceID]) {
        return await appRefs[currVideoCanvasSelected.value.instanceID].newVideoTarget(obj, mode, clear);
      }
    };
    const destroyVideoTarget = (vc)=> {
      appRefs[vc.instanceID].destroyVideoTarget(vc.mode, vc.page, vc.id);
    };
    const cutRegion = () => {
      editRegionMode.value = true;
      regionOrigin.value.cutSelectedRegion();
    };
    const changeVideoFrame = (instance, page, vcid, lastFrame, frame, emit, force=false) => {
      const rets = [];
      if(lastFrame == frame && !force)  return;

      if(linkedCanvases.value.exists(`${instance}_${page}_${vcid}_${frame}`)){ //per-frame links
        linkedCanvases.value.of(`${instance}_${page}_${vcid}_${frame}`).forEach(d => {
          if(d.componentID === undefined){
            if(appRefs[d.instance]){
              appRefs[d.instance].changeVideoFrame(d.page, d.vcid, d.frame, emit);
              rets.push({instance: d.instance, page: d.page, vcid: d.vcid});
            } 
          }
        });
      } /*else if(linkedCanvases.value.exists(`${instance}_${page}_${vcid}_all`)){ //instance links (all frames linked) 
        linkedCanvases.value.of(`${instance}_${page}_${vcid}_all`).forEach(d => {
          if(appRefs[d.instance] && d.instance === instance){
            appRefs[d.instance].changeVideoFrame(d.page, d.vcid, frame, emit);
          }
        });
      }*/ else { //no link, just update current instance's vcid's frame
        if(appRefs[instance]){
          appRefs[instance].changeVideoFrame(page, vcid, frame, emit);
          rets.push({instance, page, vcid});
        }  
      }
      return rets;
    };

    const createLinkEntry = (vc, component) => {
      let ret = null;
      if(component === null || component === undefined){
        ret = {
          instance: vc.instanceID,
          page: vc.page,
          vcid: vc.id,
          frame: vc.lastFrame,
        }
      } else {
        ret = {
          instance: vc.instanceID,
          page: vc.page,
          vcid: vc.id,
          frame: component.frame,
          componentID: component.componentID,
        }
      }
      return ret;
    };
    const createLink = (fl, ld) => {
      let linkFromName, linkToName;
      /* if(fl.instance === ld.instance){//instance linking - all frames linked
        linkToName = `${fl.instance}_${fl.page}_${fl.vcid}_all`;
        linkFromName = `${ld.instance}_${ld.page}_${ld.vcid}_all`;
      } else { */ //frame linking - only one frame linked - cross-instance
        linkToName = `${fl.instance}_${fl.page}_${fl.vcid}_${fl.frame}`;
        linkFromName = `${ld.instance}_${ld.page}_${ld.vcid}_${ld.frame}`;
      // }
      if(!linkedCanvases.value.exists(linkToName))    linkedCanvases.value.add(linkToName, fl);
      if(!linkedCanvases.value.exists(linkFromName))  linkedCanvases.value.add(linkFromName, ld);
      linkedCanvases.value.merge(linkToName, linkFromName);  
      currVideoCanvasSelected.value.instanceRef.addInstanceLink(fl, ld);
    };


    

    /*******Initialization********/
    const modifierFiles = ref(null);
    const modifierFileNames = ref(null);
    // const current_state = ref(null);
    const appRefs = reactive({});
    const appModes = reactive([]);
    const appMode = ref(null);
    const renderMode = ref(null);
    const appConfig = ref({});
    const init = () => {
      if(!appMode.value)  return;
      const apps = appModes.map(am => ({selected: appMode.value.includes(am.value), ...am}));
      apps.forEach(async app => {
        const renderApp = {...app, renderMode: renderMode.value};
        if(appRefs.hasOwnProperty(app.value)){
          await appRefs[app.value].init(renderApp);
        }
      });
    };
    const getModifierFiles = function(url){
      console.log(url)
      const queryUrl = 'https://api.github.com/repos/branson2015/DeRe_Apps/git/trees/main?recursive=1';
      return fetch(queryUrl).then(res => res.json()).then(json => {
        const data = json.tree.map(data => data.path);
        const demoFileNames = data.filter(path => path.substr(0,"demos/demos/".length) === "demos/demos/").map(file => file.substr("demos/demos/".length));
        const rvaFileNames = data.filter(path => path.substr(0, "RVA/".length) === "RVA/").map(file => file.substr("RVA/".length));
        modifierFileNames.value = demoFileNames;

        const files = modifierFileNames.value.map(file => fetch(`${props.modifier_directory}/${file}`).then(res => res.json()));
        
        const rvaFiles = rvaFileNames.map(fileName => {
          const file = fileName.slice(0, -4);
          modifierFileNames.value.push(file);
          return {
            "hidden": {},
            [file] : {},
            "startState": {
              "saveName": file,
              "appMode": [
                file
              ],
              "current_state": 0
            }
          };
        });

        return Promise.all(files).then(files => {
          modifierFiles.value = [...files, ...rvaFiles];
        });
      });
    }


    
    


    //edit functions
    const newCanvasClicked = (e) => { moveRegionMode.value ? newVideoTarget() : null; }
    const newRegionClicked = (e) => { editRegionMode.value && regionExists ? cutRegion(e) : null; }
    const cutRegionClicked = (e) => { moveRegionMode.value && currVideoCanvasSelected ? cut(e) : null; }
    const copyRegionClicked = (e) => { moveRegionMode.value && currVideoCanvasSelected ? copy(e) : null; }
    const duplicateRegionClicked = (e) => { moveRegionMode.value && currVideoCanvasSelected ? duplicate(e) : null; }
    const pasteRegionClicked = (e) => { moveRegionMode.value && pasteBin ? paste(e) : null; }
    const deleteRegionClicked = (e) => { moveRegionMode.value && currVideoCanvasSelected ? Delete(e) : null; }
    const ZupClicked = (e) => { moveRegionMode.value && currVideoCanvasSelected ? Up(e) : null; } 
    const ZdownClicked = (e) => { moveRegionMode.value && currVideoCanvasSelected ? Down(e) : null; }
    const renderModeChange = (v) => { renderMode.value = v; init(); }
    
    onMounted(() => {
      window.app = manager;
      
      //events passed from within DeRe
      emitter.on("regionExists", e => { regionExists.value = e.exists; regionOrigin.value = e.origin; });
      emitter.on("selectVideoCanvas", vc => { currVideoCanvasSelected.value = vc });
      emitter.on('changeVideoFrame', t => changeVideoFrame(...t));
      emitter.on('addComponent', addComponent);
      emitter.on('removeComponet', removeComponent);

      emitter.on('newCanvasClicked', newCanvasClicked);
      emitter.on('newRegionClicked', newRegionClicked);
      emitter.on('cutRegionClicked', cutRegionClicked);
      emitter.on('copyRegionClicked', copyRegionClicked);
      emitter.on('duplicateRegionClicked', duplicateRegionClicked);
      emitter.on('pasteRegionClicked', pasteRegionClicked);
      emitter.on('deleteRegionClicked', deleteRegionClicked);
      emitter.on('ZupClicked', ZupClicked);
      emitter.on('ZdownClicked', ZdownClicked);
      emitter.on('saveVideoCanvasState', saveVideoCanvasState);
      emitter.on('loadVideoCanvasState', loadVideoCanvasState);
      emitter.on('renderModeChange', renderModeChange);

      emitter.on('call', (fn) => { const fnName = fn.shift(); return manager[fnName](...fn); }); //generic call for all functions
      emitter.on('do', (fn) => { return fn(manager); }) //generic code mamanager can run from any component
      emitter.on('getManager', () => manager);
      
      
      getModifierFiles(props.modifier_directory).then(() => {
        emitter.emit('ready');
      })
    });

    const manager = {
      getModifierFiles,
      //modes
      appModes,
      //state
      appMode,
      renderMode,
      moveRegionMode,
      hintMode,
      editRegionMode,
      frameLinkMode,
      regionExists,
      regionOrigin,
      currVideoCanvasSelected,
      pasteBin,
      linkedCanvases,
      appConfig,
      // current_state,
      activeComponents,
      //methods
      init,
      newVideoTarget,
      destroyVideoTarget,
      cutRegion,
      renderModeChange,
      onAppModeChange,
      saveVideoCanvasState,
      loadVideoCanvasState,
      createLinkEntry,
      createLink,
      changeVideoFrame,
      Up,
      Down,
      Delete,
      copy,
      cut,
      duplicate,
      paste,
      componentClicked,
      addComponent,
      removeComponent,
      //refs
      managerRef,
      appRefs,
      utils,
      zip,
    };
    provide('manager', manager)
    return manager;
  }
}
</script>

<style>

.vjs-waiting {
  visibility: hidden;
  background: transparent;
}
.vjs-loading-spinner {
  display: none !important;
} 

</style>