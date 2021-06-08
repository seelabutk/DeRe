<template>
  <div id="container">
    <UIBar 
      :items="items"
    />
    <loom2
      directory="/apps/nytimes"
      :shortcuts="items"
      @add-shortcut="items = items.concat($event)"
    />
  </div>
</template>

<script>
import UIBar from './components/UIBar/UIBar.vue'
import Loom2 from './components/loom/loom2.vue'

export default {
  name: 'MainPage',
  components: {
    UIBar,
    Loom2,
  },
  data: function(){
    return {
      items: [],
    };
  },
}
</script>

<style scoped>
#container {
  height: 100%;
}
</style>