<template>
  <div ref="managerRef">

    <div v-show="editMode"
      id="loom-menu-linking"
      style="position: fixed; width: 100%; height: 80px; bottom: 0px; margin: 0 auto;"
    >
      <div>
        <span class="title" style='grid-column: 1/-1'>Linking</span>
        <div style="grid-column: 1">
          <input 
            ref="helpToggleRef"
            @click="toggleHintHelp"
            type="checkbox"
            class="sidebar-toggle apple-switch btn btn-default"
            style="height: 20px; width: 40px !important;"
          /><br>
          <span>Hints</span>
        </div>

        <!-- linked frames map region !-->
        <div style='grid-column: 2; margin: 5px 0;' :style="mapLinkStyle">
          <font-awesome-icon icon='map' @click="mapLinkClicked"/> <br>
          <span>link map</span>
        </div>

        <!-- LINK TARGET - push once for enable linking, again to complete linking !-->
        <div style='grid-column: 3; margin: 5px 0;' :style="linkVideoCanvasStyle">
          <font-awesome-icon icon="link" @click="() => { linkData.linkMode = linkData.linkMode == 'selectable' ? 'linkingFrom' : 'selectable' }"/><br>
          <span>{{linkData.linkMode == 'linkingFrom' ? 'linking' : linkData.linkMode == 'linkingTo' ? 'link to' : 'link'}}</span> 
        </div>

        <!-- LINK INTERACTION !-->
        
        <!-- LINK ALL !-->
      </div>
    </div>

    <div v-show="editMode"
      id="loom-menu-tools"
      :style="{
        position: 'fixed',
        width: loomMenuWidth,
        top: '150px',
        right: '0px',
      }"
    >
      <span class="title">Tools</span>

      <span class="text" style="margin-top: 0px;">Regions</span>
      <input 
        ref="regionToggleRef"
        @click="toggleRegion"
        type="checkbox"
        class="sidebar-toggle apple-switch btn btn-default"
      />

      <div class='grid-container'>
        <!-- reset the canvas and all cutouts for current target!-->
        <!-- TODO: Fix !-->
        <div style="grid-area: newCanvas" :class="regionSelect && false ? 'activeInput' : 'inactiveInput'">
          <span class="text">Canvas</span> <br>
          <font-awesome-icon icon="plus-square" @click="regionSelect && false ? newVideoTarget() : null"/>
        </div>
        
        <!-- cut, copy & paste selected regions (only available when region has been selected) !-->
        <div  style="grid-area: cutRegion" :class="regionSelect && regionExists ? 'activeInput' : 'inactiveInput'">
          <span class="text">Region</span> <br>
          <font-awesome-icon icon="border-none"  @click="e => regionSelect && regionExists ? cutRegion(e) : null"/>
        </div>
        
        <!-- cut, copy but do not paste selected region (only available when region has been selected) !-->
        <div stlye='grid-area: cut' :class="regionSelect && currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'">
          <span class="text">Cut</span> <br>
          <font-awesome-icon icon="cut" @click="e => regionSelect && currVideoCanvasSelected ? cut(e) : null"/>
        </div>

        <!-- copy, but do not paste region (only available when region has been selected) !-->
        <div stlye='grid-area: copy' :class="regionSelect && currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'">
          <span class="text">Copy</span> <br>
          <font-awesome-icon icon="copy" @click="e => regionSelect && currVideoCanvasSelected ? copy(e) : null"/>
        </div>

        <!-- do not cut, copy and paste (only available when region has been selected) !-->
        <div stlye='grid-area: dup' :class="regionSelect && currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'">
          <span class="text">Duplicate</span> <br>
          <font-awesome-icon icon="clone" @click="e => regionSelect && currVideoCanvasSelected ? duplicate(e) : null"/>
        </div>
        
        <!-- paste videoTargetCanvas from clipboard !-->
        <div style='grid-area: paste' :class="regionSelect && pasteBin ? 'activeInput' : 'inactiveInput'">
          <span class="text">Paste</span> <br>
          <font-awesome-icon icon="paste" @click="e => regionSelect && pasteBin ? paste(e) : null"/>
        </div>

        <!-- delete selected region (only available when videoTargetCanvas has been selected)!-->
        <div stlye='grid-area: delete' :class="regionSelect && currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'">
          <span class="text">Delete</span> <br>
          <font-awesome-icon icon="trash" @click="e => regionSelect && currVideoCanvasSelected ? Delete(e) : null"/>
        </div>

        <!-- z-index up !-->
        <div style='grid-area: upZ' :class="regionSelect && currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'">
          <span class="text">Up</span> <br>
          <font-awesome-icon icon="arrow-up" @click="e => regionSelect && currVideoCanvasSelected ? Up(e) : null"/>
        </div>

        <!-- z-index down !-->
        <div style='grid-area: downZ' :class="regionSelect && currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'">
          <span class="text">Down</span> <br>
          <font-awesome-icon icon="arrow-down" @click="e => regionSelect && currVideoCanvasSelected ? Down(e) : null"/>
        </div>

      </div>

      <span class="text" style="margin-top: 10px">Region Edit</span>
      <input
        ref="selectModeRef"
        @click="()=>{dragMode=!dragMode; if(!dragMode) regionToggleRef.checked = true; regionSelect = true}"
        type="checkbox"
        class="sidebar-toggle apple-switch btn btn-default"
      />

    </div>

    <div v-show="editMode"
      id="loom-menu" 
      :style="{
        position: 'fixed',
        width: loomMenuWidth,
        top: '150px',
        left: '0px',
      }"
    >
      <span class="title">DeRe</span>

      <div>
        <font-awesome-icon icon="save" class="activeInput" @click="saveVideoCanvasState"/> &nbsp;
        <font-awesome-icon icon="file" class="activeInput" @click="loadVideoCanvasState"/>
      </div>

      <span class="text" style="margin-top: 40px;">Mode</span>
      <multiselect
        ref="renderModeRef" 
        v-model="renderMode"
        mode="single"
        :canDeselect="false"
        :canClear="false"
        :options="renderModes"
        @change="onRenderModeChange"
      />

      <span class="text" style="margin-top: 40px;" >App</span>
      <multiselect 
        ref="appModeRef"
        v-model="appMode" 
        mode="tags" 
        label='minLabel'
        :options="appModes"
        :searchable="true"
        :createTag="true"
        @change="onAppModeChange"
        class='appModeMultiselect'
      />
    </div>

    <div style="position: relative">
      <loom-instance
        v-for="(app, key) in appModes"
        :key="String(key)"
        :id="app.value"
        :ref="el => { if(el) appRefs[app.value] = el }"
        :name="app.value"
        :directory="app.directory"
        :videoTargetCache="appConfig"
        :regionSelect="regionSelect"
        :overlay="hintHelpState"
        :renderMode="renderMode"
        :dragMode="dragMode"
      />
    </div>

  </div>
</template>

<script>
import Multiselect from '@vueform/multiselect'
import loomInstance from './loomInstance.vue'
import DSet from './utils/disjointset.js'
import utils from './utils/utils.js'
import * as zip from '@zip.js/zip.js'
import { ref, reactive, onMounted, computed, provide, inject, nextTick } from 'vue'

zip.configure({
  useWebWorkers: false
});

export default {
  components: { loomInstance,  Multiselect },
  props: ['directory', 'modifier_directory'],
  
  setup(props, context){
    //globals
    const managerRef = ref(null);

    /*******Loom Menu********/
    const selectModeRef = ref(null);
    const helpToggleRef = ref(null);
    const hintHelpState = ref(false);
    const regionToggleRef = ref(null);
    const loomMenuWidth = ref(120);
    const regionSelect = ref(false);
    const dragMode = ref(true);
    const regionExists = ref(false);
    const regionOrigin = ref(null);
    const pasteBin = ref(null);  
    const toggleRegion = () => {
      regionSelect.value = !regionSelect.value;
      helpToggleRef.value.checked = false;
      hintHelpState.value = false;
      selectModeRef.value.checked = false;
      dragMode.value = true;
    };
    const toggleHintHelp = () => {
      hintHelpState.value = !hintHelpState.value;
      regionToggleRef.value.checked = false;
      regionSelect.value = false;
    };
    const onRenderModeChange = (v) => {
      renderMode.value = v;
      init();
    };
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
    const videoCanvasClicked = (e) => {
      if(linkData.linkMode !== 'selectable') {
        regionSelect.value = false;
        nextTick(() => {
          const component = componentClicked(e);
          if(linkData.linkMode === 'linkingFrom') {
            linkData.firstLink = createLinkEntry(currVideoCanvasSelected.value, component);
            linkData.linkMode = 'linkingTo';
          }
          else if(linkData.linkMode === 'linkingTo'){
            const ld = createLinkEntry(currVideoCanvasSelected.value, component);
            createLink(linkData.firstLink, ld);
            linkData.linkMode = 'selectable';
          }
          regionSelect.value = true;
        });
      }
    };
    const newVideoTarget = async (obj=null, mode=undefined, clear=true) => {
      if(appRefs[currVideoCanvasSelected.value.instanceID]) {
        return await appRefs[currVideoCanvasSelected.value.instanceID].newVideoTarget(obj, mode, clear);
      }
    };
    const destroyVideoTarget = (vc)=> {
      appRefs[vc.instanceID].destroyVideoTarget(vc.mode, vc.page, vc.id);
    };
    const cutRegion = () => {
      dragMode.value = true;
      selectModeRef.value.checked = false;
      regionOrigin.value.cutSelectedRegion();
    };
    const changeVideoFrame = (instance, page, vcid, lastFrame, frame, emit) => {
      const rets = [];
      if(linkData.linkedCanvases.exists(`${instance}_${page}_${vcid}_${frame}`)){ //per-frame links
        linkData.linkedCanvases.of(`${instance}_${page}_${vcid}_${frame}`).forEach(d => {
          if(d.componentID === undefined){
            if(appRefs[d.instance]){
              appRefs[d.instance].changeVideoFrame(d.page, d.vcid, d.frame, emit);
              rets.push({instance: d.instance, page: d.page, vcid: d.vcid});
            } 
          }
        });
      } /*else if(linkData.linkedCanvases.exists(`${instance}_${page}_${vcid}_all`)){ //instance links (all frames linked) 
        linkData.linkedCanvases.of(`${instance}_${page}_${vcid}_all`).forEach(d => {
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


    /*******Frame Linking**********/
    const linkData = reactive({
      linkMode: 'selectable',
      firstLink: null,
      linkedCanvases: new DSet(),
    });
    const createLinkEntry = (vc, component) => {
      let ret = null;
      if(component === null || component === undefined){
        ret = {
          mode: vc.renderMode.value,
          instance: vc.instanceID,
          page: vc.page,
          vcid: vc.id,
          frame: vc.lastFrame,
        }
      } else {
        ret = {
          mode: vc.renderMode.value,
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
      if(!linkData.linkedCanvases.exists(linkToName))    linkData.linkedCanvases.add(linkToName, fl);
      if(!linkData.linkedCanvases.exists(linkFromName))  linkData.linkedCanvases.add(linkFromName, ld);
      linkData.linkedCanvases.merge(linkToName, linkFromName);  
      currVideoCanvasSelected.value.instanceRef.addInstanceLink(fl, ld);
      linkData.firstLink = null;
    };
    const linkVideoCanvasStyle = computed(() => {
      return {
        'none': {
          color: 'grey',
          cursor: 'default',
        },
        'selectable': {
          color: 'white',
          cursor: 'pointer',
        },
        'linkingFrom': {
          color: 'green',
          cursor: 'pointer',
        },
        'linkingTo': {
          color: 'red',
          cursor: 'pointer',
        },
      }[linkData.linkMode];
    });


    /**********Map Linking**********/
    const mapLinkData = reactive({
      mapLinkMode: 'selectable',
      firstLink: null,
      mapComponent: null,
    });
    const mapLinkClicked = async (e) => {
      const destroyMap = () => {
        if(mapLinkData.mapComponent != null)  destroyVideoTarget(mapLinkData.mapComponent.$parent);
        mapLinkData.mapLinkMode = 'selectable';
        mapLinkData.firstLink = null;
        mapLinkData.mapComponent = null;
      };
      if(mapLinkData.mapLinkMode == 'selectable'){
        if(mapLinkData.mapComponent != null)  return;
        mapLinkData.mapComponent = (await addMap()).componentRefs['0'];
        mapLinkData.mapLinkMode = 'linkingFrom';
      } else if(mapLinkData.mapLinkMode == 'linkingFrom'){
        mapLinkData.firstLink = await mapLinkData.mapComponent.getMapping();
        mapLinkData.mapLinkMode = 'linkingTo';
      } else if(mapLinkData.mapLinkMode == 'linkingTo'){
        const lds = await mapLinkData.mapComponent.getMapping();
        const fls = mapLinkData.firstLink;
        
        Object.keys(lds).forEach(key => {
          if(fls.hasOwnProperty(key)){
            createLink(fls[key], lds[key]);
          }
        });
        destroyMap();
      }
    };
    const addMap = async() => {
      const width = 550;
      const height = 315;
      return await newVideoTarget({
        reshapeable: false,
        resizeable: true,
        region: utils.rectToPoly({x: 0, y: 0, width, height, }),
        width,
        height,
        targets: [{
          actor: 'USA',
          id: '0',
          important: true,  
        }],
        startupFn: c => {
          c.lastFrame = 0;
          delete c.targetData.startupFn;
        },
        drawImage: false,
        newPageFromRoot: false,
        current_state_id: '0',
      }, undefined, false);
    };
    const mapLinkStyle = computed(() => {
      const cmap = {'selectable': 'white', 'linkingFrom': 'green', 'linkingTo': 'red'};
      return {
        cursor: 'pointer',
        color: cmap[mapLinkData.mapLinkMode],
      };
    });

    /*******Initialization********/
    const modifierFiles = ref(null);
    const modifierFileNames = ref(null);
    const editMode = ref(false);
    // const current_state = ref(null);
    const appModeRef = ref(null);
    const renderModeRef = ref(null);
    const appRefs = reactive({});
    const appModes = reactive([]);
    const renderModes = reactive([]);
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
      const queryUrl = 'https://api.github.com/repos/branson2015/DeRe_Apps/git/trees/main?recursive=1';
      return fetch(queryUrl).then(res => res.json()).then(json => {
        const fileNames = json.tree.map(data => data.path).filter(path => path.substr(0,"demos/demos/".length) === "demos/demos/").map(file => file.substr("/demos/demos".length))
        modifierFileNames.value = fileNames;
        
        const files = fileNames.map(file => fetch(`${props.modifier_directory}/${file}`).then(res => res.json()));
        return Promise.all(files).then(files => {
          modifierFiles.value = files;
        });
      });
    }
    const ISL_Load = async function(){
      while(!loadVideoCanvasState('fig4_2')){
        await utils.sleep(1000);
      };
    }

    onMounted(() => {

      window.timeLogger = []
      window.time = function(){
        const min = Math.min(...window.timeLogger);
        const max = Math.max(...window.timeLogger);
        window.timeLogger = [];
        return max - min;
      }

      if(window.location.hash.substr(1) === 'Edit') editMode.value = true;
      getModifierFiles(props.modifier_directory).then(ISL_Load);

      window.app = manager;
      const emitter = inject("emitter");
      emitter.on("regionExists", e => {
        regionExists.value = e.exists;
        regionOrigin.value = e.origin;
      });
      emitter.on("clickVideoCanvas", videoCanvasClicked);
      emitter.on("selectVideoCanvas", vc => { currVideoCanvasSelected.value = vc });
      emitter.on('changeVideoFrame', t => changeVideoFrame(...t));
      emitter.on('addComponent', addComponent);
      emitter.on('removeComponet', removeComponent);
      
      /*
      props.directories.forEach(d => {
        const appName = d.split('/').filter(t => t != '').slice(-1)[0].replaceAll(' ', '_');
        appModes.push({
          directory: d,
          label: (appName.charAt(0).toUpperCase() + appName.slice(1)),
          minLabel: (appName.charAt(0).toUpperCase() + appName.slice(1)).substr(0,4) + '...',
          value: appName,
        });
      });
      appMode.value = appModes[0];
      appModeRef.value.select(appMode.value);
      */

      ['Desktop', 'Mobile'].forEach(d => renderModes.push({
        value: d.toLowerCase(), 
        label: d,
      }));
      renderMode.value = renderModes[0].value;
      renderModeRef.value.select(renderMode.value); 
      // nextTick(init);
      
    });

    const manager = {
      //modes
      editMode,
      appModes,
      renderModes,
      //state
      appMode,
      renderMode,
      regionSelect,
      hintHelpState,
      dragMode,
      regionExists,
      regionOrigin,
      currVideoCanvasSelected,
      pasteBin,
      linkData,
      mapLinkData,
      appConfig,
      // current_state,
      loomMenuWidth,
      activeComponents,
      //computed
      mapLinkStyle,
      linkVideoCanvasStyle,
      //methods
      init,
      addMap,
      newVideoTarget,
      destroyVideoTarget,
      cutRegion,
      toggleRegion,
      toggleHintHelp,
      onRenderModeChange,
      onAppModeChange,
      saveVideoCanvasState,
      loadVideoCanvasState,
      mapLinkClicked,
      videoCanvasClicked,
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
      addComponent,
      removeComponent,
      //refs
      managerRef,
      appModeRef,
      renderModeRef,
      regionToggleRef,
      helpToggleRef,
      selectModeRef,
      appRefs,
      utils,
      zip,
    };
    provide('manager', manager)
    return manager;
  }
}
</script>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>

  .appModeMultiselect {
    --ms-tag-py: 0;
    --ms-tag-px: 0;
    --ms-tag-my: 0;
    --ms-tag-mx: 0;
  }

  * > span{
    color: #eee;
  }

  #loom-menu{
    border-radius: 0 10px 10px 0;
    background-color: rgb(45,45,45);
    width: 120px;
    height: 400px; 
    z-index: 100;
    position: fixed;
    text-align: center;
  }

  #loom-menu-linking{
    z-index: 100;
  }

  #loom-menu-linking input:after {
    width: 17px;
    height: 17px;
  }

  #loom-menu-linking > div {
    width: 30%; 
    height: 100%; 
    margin: 0 auto; 
    background-color: rgb(45,45,45); 
    border-radius: 10px 10px 0 0;
    text-align: center;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }

  #loom-menu-tools{
    border-radius: 10px 0 0 10px;
    background-color: rgb(45,45,45);
    width: 120px;
    height: 400px;
    z-index: 100;
    position: fixed;
    text-align: center;
  }

  .grid-container {
    display: grid;
    grid-template-areas:
      'newCanvas  cutRegion '
      'cut        copy      '
      'dup        paste     '
      'delete     delete    '
      'upZ        downZ     '
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
    margin-top: 16px;
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

  .activeInput {
    color: white;
    cursor: pointer;
  }

  .inactiveInput {
    color: grey;
    cursor: default;
  }
</style>