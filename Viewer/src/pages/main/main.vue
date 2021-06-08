<template>
  <div id="container">
    <UIBar 
      :items="dataItems"
    />
    <loom2
      config_filename="/apps/tableau/config.json"
      video_filename="/apps/tableau/video.mp4"
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
  computed: {
    dataItems: function(){
      return this.items.map((item, i) => ({
        ...item, 
        id: i, 
        w: 1,
        h: 1,
      }));
    }
  },
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