<template>
  <div>
    <button @click='changeWindowFocus'> Change Window Focus </button>

    <loomTarget 
      v-for="target in currentTargets"
      :key="target.id" 
      :ref="'target' + target.id"
      :targetData="target"
      :showHint="hintHelpState"
    />
  </div>
</template>

<script>
import loomTarget from './components/loomTarget.vue'
 
export default {
  name: 'App',
  
  components: {
    loomTarget
  },

  data(){
    return {
      targets: [],
      currentTargets: [],
    };
  },

  methods: {
    changeWindowFocus(){
      window.ipc.getGlobal('makeNewWindowSelectable');
    }
  },
}
</script>

<style>
* {
  box-sizing: border-box;
  -webkit-app-region: no-drag;
}

html, body {
  background-color: rgba(0,0,0,0.1);
  width: 100%;
  height: 100%;
  margin: 0 auto;
  padding: 0;
  overflow: hidden;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #fff;

  width: 100%;
  height: 100%;
  /* -webkit-app-region: drag; */
}
</style>
