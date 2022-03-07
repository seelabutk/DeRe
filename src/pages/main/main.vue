<template>
  <div id="container">
    <u-i-bar/>
    <loom-manager 
      :directories=directories
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
    const baseURL = 'https://raw.githubusercontent.com/branson2015/DeRe_Apps/main/apps/';
    const apps = ['superstore', 'median_household_income_2018', 'median_household_income_2019', 'COVID-19 Affects on School Finances', 'state_facts_for_students', 'Public Elementary-Secondary School System Finances'];
    return {
      directories: apps.map(app => `${baseURL}/${app}`),
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
