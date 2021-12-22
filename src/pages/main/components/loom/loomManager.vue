<template>
  <div>

    <div id="loom-menu" :style="loomMenuStyle">
      <span class="title">Loom</span>

      <div>
        <font-awesome-icon icon="save" class="activeInput" @click="saveVideoCanvasState"/> &nbsp;
        <font-awesome-icon icon="file" class="activeInput" @click="loadVideoCanvasState"/>
      </div>

      <span class="text">Mode</span>
      <multiselect
        ref="renderModeRef" 
        v-model="renderMode"
        mode="single"
        :canDeselect="false"
        :canClear="false"
        :options="renderModes"
        @change="onRenderModeChange"
      />

      <span class="text">App</span>
      <multiselect 
        ref="appModeRef"
        v-model="appMode" 
        mode="tags" 
        :options="appModes"
        :searchable="true"
        :createTag="true"
        @change="onAppModeChange"
      />

      <span class="text">Regions:</span>
      <input 
        ref="regionToggleRef"
        @click="toggleRegion"
        type="checkbox"
        class="sidebar-toggle apple-switch btn btn-default"
      />

      <div v-show="regionSelect" class="grid-container">
        
        <div style="grid-area: selectMode">
          <span class="text">Region Edit</span>
          <input
            ref="selectModeRef"
            @click="()=>dragMode=!dragMode"
            type="checkbox"
            class="sidebar-toggle apple-switch btn btn-default"
          />
        </div>

        <!-- reset the canvas and all cutouts for current target!-->
        <div style="grid-area: newCanvas" class='activeInput'>
          <span class="text">Canvas</span> <br>
          <font-awesome-icon icon="plus-square" style="color: white" @click="newVideoTarget"/>
        </div>
        
        <!-- cut, copy & paste selected regions (only available when region has been selected) !-->
        <div  style="grid-area: cutRegion" :class="regionExists ? 'activeInput' : 'inactiveInput'">
          <span class="text">Region</span> <br>
          <font-awesome-icon icon="border-none"  @click="e => regionExists ? cutRegion(e) : null"/>
        </div>
        
        <!-- cut, copy but do not paste selected region (only available when region has been selected) !-->
        <div stlye='grid-area: cut' :class="currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'">
          <span class="text">Cut</span> <br>
          <font-awesome-icon icon="cut" @click="e => currVideoCanvasSelected ? cut(e) : null"/>
        </div>

        <!-- copy, but do not paste region (only available when region has been selected) !-->
        <div stlye='grid-area: copy' :class="currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'">
          <span class="text">Copy</span> <br>
          <font-awesome-icon icon="copy" @click="e => currVideoCanvasSelected ? copy(e) : null"/>
        </div>

        <!-- do not cut, copy and paste (only available when region has been selected) !-->
        <div stlye='grid-area: dup' :class="currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'">
          <span class="text">Duplicate</span> <br>
          <font-awesome-icon icon="clone" @click="e => currVideoCanvasSelected ? duplicate(e) : null"/>
        </div>
        
        <!-- paste videoTargetCanvas from clipboard !-->
        <div style='grid-area: paste' :class="pasteBin ? 'activeInput' : 'inactiveInput'">
          <span class="text">Paste</span> <br>
          <font-awesome-icon icon="paste" @click="e => pasteBin ? paste(e) : null"/>
        </div>

        <!-- delete selected region (only available when videoTargetCanvas has been selected)!-->
        <div stlye='grid-area: delete' :class="currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'">
          <span class="text">Delete</span> <br>
          <font-awesome-icon icon="trash" @click="e => currVideoCanvasSelected ? Delete(e) : null"/>
        </div>

        <!-- LINK TARGET - push once for enable linking, again to complete linking !-->
        <div style='grid-area: link' :style="linkVideoCanvasStyle">
          <span class="text">{{linkData.linkMode == 'linkingFrom' ? 'linking' : linkData.linkMode == 'linkingTo' ? 'link to' : 'link'}}</span> <br>
          <font-awesome-icon icon="link" @click="() => { if(linkData.linkMode == 'selectable') linkData.linkMode = 'linkingFrom' }"/>
        </div>
        
        <!-- linked frames map region !-->
        <div style='grid-area: mapRegion' :style="mapLinkStyle">
          <span class="text">link map</span> <br>
          <font-awesome-icon icon='map' @click="mapLinkClicked"/>
        </div>

      </div>

      <span class="text">Hints:</span>
      <input 
        ref="helpToggleRef"
        @click="toggleHintHelp"
        type="checkbox"
        class="sidebar-toggle apple-switch btn btn-default"
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
import { ref, reactive, onMounted, computed, inject, nextTick } from 'vue'

export default {
  components: { loomInstance,  Multiselect },
  props: ['directories'],
  
  setup(props){
    //data
    const regionExists = ref(false);
    const activeComponents = ref([]);
    const pasteBin = ref(null);
    const currVideoCanvasSelected = ref(null);
    const current_state = ref(null);
    const appConfig = ref({});
    const hintHelpState = ref(false);
    const regionSelect = ref(false);
    const regionOrigin = ref(null);
    const dragMode = ref(true);
    const loomMenuWidth = ref(120);
    const mapLinkData = reactive({
      mapLinkMode: 'selectable',
      firstLink: null,
      mapComponent: null,
    });
    const linkData = reactive({
      linkMode: 'selectable',
      firstLink: null,
      linkedCanvases: new DSet(),
    });
    const appModes = reactive([]);
    const renderModes = reactive([]);
    const appMode = ref(null);
    const renderMode = ref(null);

    //computed
    const loomMenuStyle = computed(() => ({
      position: 'absolute',
      width: loomMenuWidth.value,
      height: 'auto',
      top: '150px',
      left: '0px',
    }));
    const mapLinkStyle = computed(() => {
      const cmap = {'selectable': 'white', 'linkingFrom': 'green', 'linkingTo': 'red'};
      return {
        cursor: 'pointer',
        color: cmap[mapLinkData.mapLinkMode],
      };
    });
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

    //refs
    const appModeRef = ref(null);
    const renderModeRef = ref(null);
    const regionToggleRef = ref(null)
    const helpToggleRef = ref(null);
    const selectModeRef = ref(null);
    const appRefs = reactive({});

    //methods
    const init = () => {
      const apps = appModes.map(am => ({selected: appMode.value.includes(am.value), ...am})).slice(0, props.directories.length);
      apps.forEach(app => {
        const renderApp = {...app, renderMode: renderMode.value};
        if(appRefs.hasOwnProperty(app.value)){
          appRefs[app.value].init(renderApp);
        }
      });
    };
    const addMap = async() => {
      const width = 100;
      const height = 100;
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
        current_state_id: '0',
      }, undefined, false);
    };
    const newVideoTarget = async (obj=null, mode=undefined, clear=true) => {
      if(appRefs[currVideoCanvasSelected.value.instanceID]) {
        return await appRefs[currVideoCanvasSelected.value.instanceID].newVideoTarget(obj, mode, clear);
      }
    };
    const cutRegion = () => {
      dragMode.value = true;
      selectModeRef.value.checked = false;
      regionOrigin.value.cutSelectedRegion();
    };
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
    const saveVideoCanvasState = () => {
      const name = prompt("Enter name to save config as:");
      if(name == null || name == "")  return;
      const saveNames = JSON.parse(localStorage.getItem('saveNames')) || [];
      if(saveNames.some(n => n == name)){
        prompt("Name already taken");
        return;
      }
      saveNames.push(name);
      appConfig.value['startState'] = {
        appMode: appMode.value,
        current_state: current_state.value,
      };
      try{
        localStorage.setItem('saveNames', JSON.stringify(saveNames));
        localStorage.setItem(name, JSON.stringify(appConfig.value));
        //todo: offer file download
      } catch (err) {
        alert(`Could not save to localStorage: ${String(err)}`);
        console.error(err);
        //todo: offer file download
      }
    };
    const loadVideoCanvasState = () => {
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
      appConfig.value = JSON.parse(localStorage.getItem(loadName));
      current_state.value = appConfig.value['startState']['current_state'];
      appMode.value = appConfig.value['startState']['appMode'];
      delete appConfig.value['startState'];
      init();
    };
    const mapLinkClicked = async () => {
      if(mapLinkData.mapLinkMode == 'selectable'){
        mapLinkData.mapComponent = (await addMap()).$refs['target0'];
        mapLinkData.mapLinkMode = 'linkingFrom';
      } else if(mapLinkData.mapLinkMode == 'linkingFrom'){
        mapLinkData.firstLink = await mapLinkData.mapComponent.getMapping();
        mapLinkData.mapLinkMode = 'linkingTo';
      } else if(mapLinkData.mapLinkMode == 'linkingTo'){
        const lds = mapLinkData.mapComponent.getMapping();
        const fls = mapLinkData.firstLink;
        Object.keys(lds).forEach(key => {
          if(fls.hasOwnProperty(key)){
            createLink(fls[key], lds[key]);
          }
        });
        mapLinkData.mapLinkMode = 'selectable';
      }
    };
    const videoCanvasClicked = () => {
      if(linkData.linkMode === 'linkingFrom') {
        linkData.firstLink = createLinkEntry(currVideoCanvasSelected.value);
        linkData.linkMode = 'linkingTo';
      }
      else if(linkData.linkMode === 'linkingTo'){
        const ld = createLinkEntry(currVideoCanvasSelected.value);
        createLink(linkData.firstLink, ld);
        linkData.linkMode = 'selectable';
      }
    };
    const createLinkEntry = (vc) => ({
      mode: vc.renderMode.value,
      instance: vc.instanceID,
      page: vc.page,
      vcid: vc.id,
      frame: vc.lastFrame
    });
    const createLink = (fl, ld) => {
      let linkFromName, linkToName;
      if(fl.instance === ld.instance){//instance linking - all frames linked
        linkToName = `${fl.instance}_${fl.page}_${fl.vcid}_all`;
        linkFromName = `${ld.instance}_${ld.page}_${ld.vcid}_all`;
      } else { //frame linking - only one frame linked - cross-instance
        linkToName = `${fl.instance}_${fl.page}_${fl.vcid}_${fl.frame}`;
        linkFromName = `${ld.instance}_${ld.page}_${ld.vcid}_${ld.frame}`;
      }
      if(!linkData.linkedCanvases.exists(linkToName))    linkData.linkedCanvases.add(linkToName, fl);
      if(!linkData.linkedCanvases.exists(linkFromName))  linkData.linkedCanvases.add(linkFromName, ld);
      linkData.linkedCanvases.merge(linkToName, linkFromName);  
      videoCanvasSelectedRef.value.addInstanceLink(fl, ld);
      linkData.firstLink = null;
    };
    const changeVideoFrame = (instance, page, vcid, frame, emit) => {
      if(linkData.linkedCanvases.exists(`${instance}_${page}_${vcid}_${frame}`)){ //per-frame links
        linkData.linkedCanvases.of(`${instance}_${page}_${vcid}_${frame}`).forEach(d => {
          appRefs[d.instance].changeVideoFrame(d.page, d.vcid, d.frame, emit);
        });
      } else if(linkData.linkedCanvases.exists(`${instance}_${page}_${vcid}_all`)){ //instance links (all frames linked) 
        linkData.linkedCanvases.of(`${instance}_${page}_${vcid}_all`).forEach(d => {
          if(appRefs[d.instance] && d.instance === instance){
            appRefs[d.instance].changeVideoFrame(d.page, d.vcid, frame, emit);
          }
        });
      } else { //no link, just update current instance's vcid's frame
        if(appRefs[instance]){
          appRefs[instance].changeVideoFrame(page, vcid, frame, emit);
        }
      }
    };
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
    const addComponent = ([name, component]) => { activeComponents.value[name] = component };
    const removeComponent = (name) => { delete activeComponents[name]; };


    onMounted(() => {
      const emitter = inject("emitter");
      emitter.on("regionExists", e => {
        regionExists.value = e.exists;
        regionOrigin.value = e.origin;
      });
      emitter.on("clickVideoCanvas", videoCanvasClicked);
      emitter.on("selectVideoCanvas", vc => currVideoCanvasSelected.value = vc );
      emitter.on('changeVideoFrame', t => changeVideoFrame(...t));
      emitter.on('addComponent', addComponent);
      emitter.on('removeComponet', removeComponent);
      //set up initial render and app modes
      props.directories.forEach(d => {
        const appName = d.split('/').filter(t => t != '').slice(-1)[0];
        appModes.push({
          directory: d,
          label: appName.charAt(0).toUpperCase() + appName.slice(1),
          value: appName,
        });
      });
      appMode.value = appModes[0];
      appModeRef.value.select(appMode.value);
      ['Desktop', 'Mobile'].forEach(d => renderModes.push({
        value: d.toLowerCase(), 
        label: d,
      }));
      renderMode.value = renderModes[0].value;
      renderModeRef.value.select(renderMode.value); 
      nextTick(init);
    });

    return {
      //modes
      appModes,
      renderModes,
      //state
      appMode,
      renderMode,
      //
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
      current_state,
      loomMenuWidth,
      activeComponents,
      //computed
      loomMenuStyle,
      mapLinkStyle,
      linkVideoCanvasStyle,
      //methods
      init,
      addMap,
      newVideoTarget,
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
      Delete,
      copy,
      cut,
      duplicate,
      paste,
      addComponent,
      removeComponent,

      //refs
      appModeRef,
      renderModeRef,
      regionToggleRef,
      helpToggleRef,
      selectModeRef,
      appRefs,
    };
  }
}
</script>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
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
      'dup        paste     '
      'delete     link      '
      'mapRegion  mapRegion '
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