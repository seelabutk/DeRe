<template>
  <div id="container">
    <UIBar />
    <loom2
      config_filename="/apps/tableau/config.json"
      video_filename="/apps/tableau/video.mp4"
    />
  </div>
</template>

<script>
import UIBar from '../components/UIBar.vue'
import Loom2 from '../components/loom/loom2.vue'

export default {
  name: 'MainPage',
  components: {
    UIBar,
    Loom2,
  },
  data: () => ({
    
  }),
  methods: {

  }
}
</script>

<style scoped>
</style>