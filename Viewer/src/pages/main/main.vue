<template>
  <div id="container">
    <u-i-bar/>
    <loom-manager :directories=directories />
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
    return {
      directories: ['/apps/tableau', '/apps/nytimes'],
    };
  },
}
</script>

<style scoped>
#container {
  height: 100%;
}
</style>