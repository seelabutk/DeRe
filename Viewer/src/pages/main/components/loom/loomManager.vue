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
        ref="renderMode" 
        v-model="renderMode"
        mode="single"
        :canDeselect="false"
        :canClear="false"
        :options="renderModes"
        @change="onRenderModeChange"
      />

      <span class="text">App</span>
      <multiselect 
        ref="appMode"
        v-model="appMode" 
        mode="tags" 
        :options="appModes"
        :searchable="true"
        :createTag="true"
        @tag="addNewMode"
        @change="onAppModeChange"
      />

      <span class="text">Regions:</span>
      <input 
        ref="regionToggle"
        @click="toggleRegion"
        type="checkbox"
        class="sidebar-toggle apple-switch btn btn-default"
      />

      <div v-show="regionSelect" class="grid-container">
        
        <div style="grid-area: selectMode">
          <span class="text">Region Edit</span>
          <input
            ref="SelectMode"
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
          <span class="text">{{linkMode == 'linking' ? 'link to' : 'link'}}</span> <br>
         <font-awesome-icon icon="link" @click="linkVideoCanvas"/>
        </div>
        <!-- CREATE NEW CUTOUT TARGET FOR CURRENT FRAME !-->

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

      <!--<table class="table-striped search-results-table">
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
      </table>!-->
    </div>

    <div>
      <loom-instance
        v-for="(directory, key) in directories"
        :key="key"
        :id="`loomInstance-${key}`"
        :ref="`loomInstance-${key}`"
        :directory=directory
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
import Fuse from 'fuse.js'
import Multiselect from '@vueform/multiselect'
import loomInstance from './loomInstance.vue'

// TODOs: 
// make "children" flat array, not weird empty object keyed on id
// fix saving to use transformedTargetCache's

// linking videoCanvases
//    create link mapping and automation for it somehow
// z-index adjuster
// better dragging for videoCanvas'


// auto-generate app based on user interaction
// create api for auto generating apps


export default {

  components: {
    loomInstance, 
    Multiselect
  },
  props: {
    directories: {
      type: Array,
    },
  },

  data: function(){
    return {
      //state
      appModes: [],
      appMode: null,
      renderMode: null,
      renderModes: [],
      regionSelect: false,
      hintHelpState: false,
      dragMode: true,
      regionExists: false,
      regionOrigin: null,
      currVideoCanvasSelected: null,
      pasteBin: null,
      linkMode: 'none',
      searchResults: [],
      linkedCanvases: {},
      appConfig: {},
      //settings
      loomMenuWidth: 120,
    };
  },

  computed: {
    loomMenuStyle: function(){
      return {
        position: 'absolute',
        width: this.loomMenuWidth,
        height: 'auto',
        top: '150px',
        left: '0px',
      };
    },

    linkVideoCanvasStyle: function(){
      if(this.linkMode == 'none'){
        return {
          color: 'grey',
          cursor: 'default',
        };
      }
      else if(this.linkMode == 'selectable'){
        return {
          color: 'white',
          cursor: 'pointer',
        };
      }else if(this.linkMode == 'linking'){
        return {
          color: 'green',
          cursor: 'pointer',
        };
      }
    },
  },

  watch: {
    currVideoCanvasSelected: function(v){
      if(v) this.linkMode = 'selectable';
    }
  },

  methods: {
    init(){
      const apps = this.appModes.map(am => ({selected: this.appMode.includes(am.value), ...am})).slice(0,this.directories.length);
      apps.forEach((app,i) => {
        const renderApp = {...app, renderMode: this.renderMode};
        if(this.$refs[`loomInstance-${i}`])
          this.$refs[`loomInstance-${i}`].init(renderApp);
      });
    },

    newVideoTarget(obj=null){
      if(this.$refs[`loomInstance-${this.currVideoCanvasSelected.id}`])
        this.$refs[`loomInstance-${this.currVideoCanvasSelected.id}`].newVideoTarget(obj, undefined, true);
    },

    cutRegion(){
      this.dragMode = true;
      this.$refs.SelectMode.checked = false;
      this.regionOrigin.cutSelectedRegion();
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

    toggleRegion(e){
      this.regionSelect = !this.regionSelect;
      this.$refs.helpToggle.checked = false;
      this.hintHelpState = false;
      this.$refs.SelectMode.checked = false;
      this.dragMode = true;
    },

    toggleHintHelp(){
      this.hintHelpState = !this.hintHelpState;
      this.$refs.regionToggle.checked = false;
      this.regionSelect = false;
    },

    onRenderModeChange(v){
      this.renderMode = v;
      this.init();
    },

    onAppModeChange(v){
      this.appMode = v;
      this.init();
    },

    saveVideoCanvasState(){
      const name = prompt("Enter name to save config as:");
      if(name == null || name == "")  return;

      const saveNames = JSON.parse(localStorage.getItem('saveNames')) || [];
      if(saveNames.some(n => n == name)){
        prompt("Name already taken");
        return;
      }
      saveNames.push(name);
      

      this.appConfig['startState'] = {
        appMode: this.appMode,
        current_state: this.current_state,
      };

      try{
        localStorage.setItem('saveNames', JSON.stringify(saveNames));
        localStorage.setItem(name, JSON.stringify(this.appConfig));
        //todo: offer file download
      } catch (err) {
        alert(`Could not save to localStorage: ${String(err)}`);
        console.error(err);
        //todo: offer file download
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
      this.appConfig = JSON.parse(localStorage.getItem(loadName));
  
      this.current_state = this.appConfig['startState']['current_state'];
      this.appMode = this.appConfig['startState']['appMode'];

      delete this.appConfig['startState'];

      this.init();
    },

    linkVideoCanvas(){
      //TODO
      if(!this.currVideoCanvasSelected){
        this.linkMode = 'none';
        return;
      };

      if(this.linkMode == 'selectable'){
        this.linkMode = 'linking';
        return;
      }
      if(this.linkMode == 'linking'){
        this.linkMode = 'none';
        return;
      }
    },

    changeVideoFrame(instance, id, lastFrame, emit){
      if(this.linkedCanvases[instance]){
        this.linkedCanvases[instance].forEach(cid => {
          if(this.$refs[`loomInstance-${cid}`])
            this.$refs[`loomInstance-${cid}`].changeVideoFrame(id, lastFrame, emit);
        });
      } else {
        if(this.$refs[instance])
          this.$refs[instance].changeVideoFrame(id, lastFrame, emit);
      }
    },

    addNewMode(mode){
      console.log('mode: ', mode);
      console.log('TODO'); // TODO;
    },

    Delete(){
      if(this.$refs[this.currVideoCanvasSelected.loomID]){
        this.$refs[this.currVideoCanvasSelected.loomID].Delete(this.currVideoCanvasSelected);
      }
    },
    copy(){
      this.pasteBin = this.currVideoCanvasSelected;
      this.pasteBin.targetData.start_state = this.currVideoCanvasSelected.current_state;
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
    paste(){
      if(this.$refs[this.pasteBin.loomID])
        this.$refs[this.pasteBin.loomID].paste(this.pasteBin.targetData);
    },
  },

  mounted(){
    window.app = this;
    //set up events
    this.emitter.on("regionExists", e => {
      this.regionExists = e.exists;
      this.regionOrigin = e.origin;
    });
    this.emitter.on("selectVideoCanvas", vc => this.currVideoCanvasSelected = vc );
    this.emitter.on('changeVideoFrame', t => this.changeVideoFrame(...t));
    
    
    //set up initial render and app modes
    this.directories.forEach(d => {
      let appName = d.split('/');
      appName = appName[appName.length-1];
      this.appModes.push({
        label: appName.charAt(0).toUpperCase() + appName.slice(1),
        value: appName,
      });
    });
    this.appMode = this.appModes[0].value;
    
    ['Desktop', 'Mobile'].forEach(d => this.renderModes.push({
      value: d.toLowerCase(), 
      label: d,
    }));
    this.renderMode = this.renderModes[0].value;
    
    //these cause re-renderings because of stupid @change event, unecessary
    this.$refs.appMode.select(this.appMode);
    this.$refs.renderMode.select(this.renderMode); 
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

  /*.highlight {
    fill: rgba(246, 230, 80, 0.7);
    stroke: rgba(250, 240, 80, 0.8);
  }
  div.highlight {
    background-color: rgba(246, 230, 80, 0.7);
    border: 1px solid rgba(250, 240, 80, 0.8);
  }*/

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