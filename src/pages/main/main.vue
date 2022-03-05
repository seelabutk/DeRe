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
    const baseURL = 'https://raw.githubusercontent.com/branson2015/DeRe_Apps/main';
    const apps = ['tableau', 'COVID-19 Affects on School Finances', 'state_facts_for_students', 'Public Elementary-Secondary School System Finances'];
    return {
      directories: apps.map(app => `${baseURL}/${app}`),
    };
  },
}
</script>

<style scoped>
#container {
  height: 100%;
}
</style>
