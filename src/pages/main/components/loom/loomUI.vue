<template>

    <div class="grid-container">
        <div class="header">
            {{manager ? manager.appMode[0] : ''}}
        </div>
        
        <div class="left">
            <div class="tool-column"
            style="height: 20vh">
              <ul class="tool-row">
                <li class="loadSave">
                  <font-awesome-icon icon="save" class="tool-item-left" style="height: 50px; padding: 5px; display: block;" @click="() => emitEvent('saveVideoCanvasState')"/>
                </li>
                <li class="loadSave">
                  <font-awesome-icon icon="file" class="tool-item-left" style="height: 50px; padding: 5px; display: block;" @click="() => emitEvent('loadVideoCanvasState', undefined)"/>
                </li>
              </ul>
            </div>

            <ul class="tool-column"
            style="height: 60vh;">
                
                <!-- Region Move Toggle !-->
                <li class="tool-item-left"
                @click="regionMoveToggled"
                :class="manager && manager.moveRegionMode ? 'activeInput' : 'inactiveInput'"
                style="cursor: pointer"
                ref="moveRegionToggleRef">
                    <span class="text">Move Region</span>
                </li>

                <!-- Region Edit Toggle !-->
                <li class="tool-item-left"
                ref="editRegionToggleRef"
                style="cursor: pointer"
                @click="regionEditToggled"
                :class="manager && manager.editRegionMode ? 'activeInput' : 'inactiveInput'">
                    <span class="text">Region Edit</span>                    
                </li>
                
                <li class="tool-item-left"
                ref=linkFrameToggleRef
                style="cursor: pointer"
                @click="frameLinkEditToggled"
                :class="manager && manager.frameLinkMode ? 'activeInput' : 'inactiveInput'">
                  <span style="font-size: 29px;"> Frame Linking </span>
                </li>

                <!-- Hint Toggle !-->
                <li class="tool-item-left"
                ref="helpToggleRef"
                style="cursor: pointer"
                @click="hintToggled"
                :class="manager && manager.hintMode ? 'activeInput' : 'inactiveInput'">
                    <span>Hints</span>
                </li>
            </ul>
        </div>

        <div class="middle"><slot/></div>  

        <div class="right">

            <!-- Moving !-->
            <ul class="tool-column tool-change" id="moveRegion">

                <!-- reset the canvas and all cutouts for current target!-->
                <!-- TODO: Fix !-->
                <li class="tool-item" 
                :class="moveRegionMode ? 'activeInput' : 'inactiveInput'"
                @click="() => emitEvent('newCanvasClicked')">
                    <font-awesome-icon icon="plus-square"/>
                </li>
                
                <!-- cut, copy but do not paste selected region (only available when region has been selected) !-->
                <li class="tool-item"
                :class="moveRegionMode && manager.currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'"
                @click="() => emitEvent('cutRegionClicked')">
                    <font-awesome-icon icon="cut" />
                </li>

                <!-- copy, but do not paste region (only available when region has been selected) !-->
                <li class="tool-item"
                :class="moveRegionMode && manager.currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'"
                @click="() => emitEvent('copyRegionClicked')">
                    <font-awesome-icon icon="copy" />
                </li>

                <!-- do not cut, copy and paste (only available when region has been selected) !-->
                <li class="tool-item"
                :class="moveRegionMode && manager.currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'"
                @click="() => emitEvent('duplicateRegionClicked')">
                    <font-awesome-icon icon="clone" />
                </li>

                <!-- paste videoTargetCanvas from clipboard !-->
                <li class="tool-item"
                :class="moveRegionMode && manager.pasteBin ? 'activeInput' : 'inactiveInput'"
                @click="() => emitEvent('pasteRegionClicked')">
                    <font-awesome-icon icon="paste"/>
                </li>

                <!-- delete selected region (only available when videoTargetCanvas has been selected)!-->
                <li class="tool-item"
                :class="moveRegionMode && manager.currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'"
                @click="() => emitEvent('deleteRegionClicked')">
                    <font-awesome-icon icon="trash" />
                </li>

                <!-- z-index up !-->
                <li class="tool-item"
                :class="moveRegionMode && manager.currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'"
                @click="() => emitEvent('ZupClicked')">
                    <font-awesome-icon icon="arrow-up" />
                </li>

                <!-- z-index down !-->
                <li class="tool-item"
                :class="moveRegionMode && manager.currVideoCanvasSelected ? 'activeInput' : 'inactiveInput'"
                @click="() => emitEvent('ZdownClicked')">
                    <font-awesome-icon icon="arrow-down" />
                </li>

            </ul>

            <!-- Editing !-->
            <ul class="tool-column tool-change" id="editRegion">
              <!-- cut, copy & paste selected regions (only available when region has been selected) !-->
                <li class="tool-item"
                :class="editRegionMode && manager.regionExists ? 'activeInput' : 'inactiveInput'"
                @click="emitEvent('newRegionClicked')">
                    <font-awesome-icon icon="border-none"/>
                </li>

                <!-- Scale !-->
                <!--
                <li class="tool-item"
                :class="editRegionMode ? 'activeInput' : 'inactiveInput'"
                @click="rescale">
                  <font-awesome-icon icon=""/>
                </li>
                !-->

                <!-- Add Vertex !-->
                <!--
                <li class="tool-item"
                :class="editRegionMode ? 'activeInput' : 'inactiveInput'"
                @click="rescale">
                  <font-awesome-icon icon=""/>
                </li>
                !-->

                <!-- Delete Vertex !-->
                <!--
                <li class="tool-item"
                :class="editRegionMode ? 'activeInput' : 'inactiveInput'"
                @click="rescale">
                  <font-awesome-icon icon=""/>
                </li>
                !-->

            </ul>


            <!-- frame linking !-->
            <ul class="tool-column tool-change" id="frameLink">

                <!-- LINK TARGET - push once for enable linking, again to complete linking !-->
                <li class="tool-item"
                :style="linkVideoCanvasStyle"
                @click="linkClicked">
                    <!--<span>{{linkData.linkMode == 'linkingFrom' ? 'linking' : linkData.linkMode == 'linkingTo' ? 'link to' : 'link'}}</span> !-->
                    <font-awesome-icon icon="link"
                    :style="{color: {linkingFrom: 'green', linkingTo: 'red'}[linkData.linkMode] || 'white'}"/>
                </li>

                <!-- linked frames map region !-->
                <li class="tool-item" 
                :style="mapLinkStyle"
                @click="mapLinkClicked">
                    <!--<span>link map</span>!-->
                    <font-awesome-icon icon='map' />
                </li>
                
                <!-- LINK INTERACTION !-->
        
                <!-- LINK ALL !-->

            </ul>

            <ul class="tool-column tool-change" id="hint">
            </ul>
        </div>
        
        <!-- <div class="footer">
            Footer
        </div> -->
    </div>

</template>

<script>

import { ref, reactive, onMounted, computed, provide, inject, nextTick } from 'vue'
import Multiselect from '@vueform/multiselect'
import utils from './utils/utils'

export default {
  components: { 
    Multiselect,
  },
  props: [],
  
  setup(props, context){

    const emitter = inject("emitter");
    let manager = ref(null);

    /*******Frame Linking**********/
    const linkData = reactive({
      linkMode: 'selectable',
      firstLink: null,
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


    /**********Map Linking**********/
    const mapLinkData = reactive({
      mapLinkMode: 'selectable',
      firstLink: null,
      mapComponent: null,
    });
    const mapLinkClicked = async (e) => {
      const destroyMap = () => {
        if(mapLinkData.mapComponent != null)  manager.value.destroyVideoTarget(mapLinkData.mapComponent.$parent);
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
            manager.value.createLink(fls[key], lds[key]);
          }
        });
        destroyMap();
      }
    };
    const addMap = async() => {
      const width = 550;
      const height = 315;
      return await manager.value.newVideoTarget({
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

    const linkClicked = () => {
      linkData.linkMode = linkData.linkMode == 'selectable' ? 'linkingFrom' : 'selectable';
    }

    const videoCanvasClicked = (e) => {
      if(linkData.linkMode !== 'selectable') {
        nextTick(() => {
          const component = emitter.emit('call', ['componentClicked', e]);
          if(linkData.linkMode === 'linkingFrom') {
            emitter.emit('do', (manager) => {
              linkData.firstLink = manager.createLinkEntry(manager.currVideoCanvasSelected.value, component);
            });
            linkData.linkMode = 'linkingTo';
          }
          else if(linkData.linkMode === 'linkingTo'){
            emitter.emit('do', (manager) => {
              const ld = manager.createLinkEntry(manager.currVideoCanvasSelected.value, component);
              manager.createLink(linkData.firstLink, ld);
            });
            linkData.linkMode = 'selectable';
          }
        });
      }
    };

    const moveRegionMode = computed(() => {
        if(manager.value === null)  return false;
        return manager.value.moveRegionMode;
    });
    const editRegionMode = computed(() => {
      if(manager.value === null)  return false;
      return manager.value.editRegionMode;
    });



    const radioModes = {
      moveRegionMode: 'moveRegion',
      editRegionMode: 'editRegion',
      frameLinkMode: 'frameLink',
      hintMode: 'hint'
    };

    const radioToggle = (selected) => {
      for(const radioMode in radioModes){
        const toolbar = $(`#${radioModes[radioMode]}`);
        if(radioMode === selected){
          let v;
          emitter.emit('do', (manager) => { 
            manager[radioMode].value = !manager[radioMode].value;
            v = manager[radioMode].value;
          });
          toolbar.css('display', v ? 'flex' : 'none');
          continue;
        }
        emitter.emit('do', (manager) => { manager[radioMode].value = false });
        toolbar.css('display', 'none');
      }
    }




    const regionMoveToggled = () => { radioToggle('moveRegionMode'); }
    const regionEditToggled = () => { radioToggle('editRegionMode'); }
    const frameLinkEditToggled = () => { radioToggle('frameLinkMode'); }
    const hintToggled = () => { radioToggle('hintMode'); }
    
    const emitEvent = (evt, args) => { emitter.emit(evt, args); }
    
    const renderModes = reactive([]);
    const renderModeRef = ref(null);
    const linkFrameToggleRef = ref(null);

    onMounted(() => {
        emitter.on("clickVideoCanvas", videoCanvasClicked);
        emitter.on('ready', () => {
          manager.value = emitter.emit('getManager')[0];
          emitter.emit('loadVideoCanvasState', 'tableau'); //todo: loading bar
        });

        $('.tool-change').css('display', 'none');
    });

    const ret = {
        manager,
        emitEvent,
        linkData,
        mapLinkData,
        linkVideoCanvasStyle,
        mapLinkClicked,
        addMap,
        mapLinkStyle,
        linkClicked,
        videoCanvasClicked,
        renderModes,
        renderModeRef,
        moveRegionMode,
        editRegionMode,
        linkFrameToggleRef,
        regionMoveToggled,
        regionEditToggled,
        frameLinkEditToggled,
        hintToggled,
    };
    provide('UI', ret);
    return ret;
  }
};






//TODO: fix frame linking
// fill out edit mode w/ scale, add/delete nodes, etc
// create new linking mode w/ greater ability to link frames (maybe get ambitious with a state/link graph viewer?)








</script>

<style src="@vueform/multiselect/themes/default.css"></style>
<style>
/* can't do style scoped with :root variables */

:root {
  --color1: #f6f8f7;
  --color2: #e4f5e9;
  --color3: #8ed6c8;
  --color4: #41ad89;
  --color5: #4c5b62;
  --color6: #1a2225;
}

html {
  box-sizing: border-box;
}

html *,
html *::after,
html *::before {
  box-sizing: inherit;  
}

body {
  font-family: Arial, Helvetica, sans-serif;
}

.appModeMultiselect {
--ms-tag-py: 0;
--ms-tag-px: 0;
--ms-tag-my: 0;
--ms-tag-mx: 0;
}

/* The grid container */
.grid-container {
  display: grid;
  height: 100vh;

  grid-template-rows: 60px 1fr 0px;
  grid-template-columns: 240px 1fr 120px;
  grid-template-areas: 
    'header header header' 
    'left middle right' 
    'footer footer footer';
  /* grid-column-gap: 10px; - if you want gap between the columns */
} 

/* Style the header */
.header {
  grid-area: header;
  background-color: var(--color4);
  text-align: center;
  font-size: 40px;
  line-height: 60px;
  color: var(--color1);
  padding: 0;
  margin: 0;
  height: 60px;
  -webkit-text-stroke: 1px var(--color2);
	text-shadow: 0px 2px 2px var(--color2);
  font-weight: bold;
}

.left, .right, .footer{
  background-color: var(--color3);
}

/* Style the left column */
.left {
  grid-area: left;
}

/* Style the middle column */
.middle {
  grid-area: middle;
  overflow: hidden;
  background-color: var(--color1);
}

/* Style the right column */
.right {
  grid-area: right;
}

/* Style the footer */
.footer {
  grid-area: footer;
  padding: 10px;
  text-align: center;
}

.tool-row, .tool-column{
  padding: 0;
  margin: 0;
  list-style: none;
  width: 100%;
  height: 100%;
  
  -ms-box-orient: horizontal;
  display: -webkit-box;
  display: -moz-box;
  display: -ms-flexbox;
  display: -moz-flex;
  display: -webkit-flex;
  display: flex;
  -webkit-flex-direction: horizontal; 
  flex-direction: horizontal; 

  -webkit-box-pack: justify;
  -webkit-justify-content: space-between;
  -ms-flex-pack: justify;
  justify-content: space-between;
}

.tool-column { 
  flex: 1;
  padding-bottom: 10px;
  -ms-box-orient: column;
  -webkit-flex-direction: column; 
  flex-direction: column;
}


.tool-item, .tool-item-left, .activeInput {
  background-color: var(--color4);
  cursor: pointer;
}

.tool-item, .tool-item-left{
  box-shadow: 0 8px 6px -6px rgb(0 0 0 / 0.2);
  width: 75px;
  height: 75px;
  line-height: 75px;

  color: white;
  font-weight: bold;
  font-size: 2em;
  text-align: center;
  margin: 0 auto;
  border-radius: 5px;
}

.tool-item-left{
  width: 90% !important;
}

.tool-change {
  margin-top: 10px;
}

.activeInput {
  color: white;
  cursor: pointer;
}

.inactiveInput {
  background-color: var(--color2);
  color: grey;
  cursor: default;
}

.toggledOnInput {
  background-color: var(--color4);
}

.loadSave {
  width: 50%;
  margin-top: 5px;
}

</style>