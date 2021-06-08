<template>
  <div id="container">
    <UIBar 
      :items="items"
    />
    <loom2
      directory="/apps/nytimes"
      :shortcuts="items"
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
  computed: {},
  data: function(){
    return {
      items: [],
    };
  },
  methods: {
    onClick(e){
      console.log('clicked! ', e);
    }
  }
}
</script>

<style scoped>
#container {
  height: 100%;
}
</style>