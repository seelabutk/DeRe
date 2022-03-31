<template>
  <div id="container">
    <u-i-bar/>
    <loom-manager 
      :directory=directory
      :modifier_directory=modifier_directory 
    />
  </div>
</template>

<script>
import UIBar from './components/UIBar/UIBar.vue'
import loomManager from './components/loom/loomManager.vue'

export default {
  name: 'MainPage',
  components: {
    UIBar,
    loomManager,
  },
  data: function(){
    const modifier_directory = 'https://raw.githubusercontent.com/branson2015/DeRe_Apps/main/demos/demos';
    const baseURL = 'https://raw.githubusercontent.com/branson2015/DeRe_Apps/main/RVA';
    
    return {
      directory: baseURL,
      modifier_directory,
    };
  },
}
</script>

<style scoped>
#container {
  height: 100%;
}
</style>
