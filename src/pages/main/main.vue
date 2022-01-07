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
<<<<<<< HEAD
    const apps = ['tableau', 'nytimes', 'median_household_income_2018', 'median_household_income_2019', 'COVID-19 Affects on School Finances'];
=======
    const apps = ['tableau', /* 'nytimes', 'median_household_income_2018', 'median_household_income_2019','COVID-19 Affects on School Finances','Public Elementary-Secondary School System Finances' */];
>>>>>>> 1805324f9693810330f963a92ea21fc06b076623
    return {
      directories: apps.map(app => `${baseURL}/${app}/`),
    };
  },
}
</script>

<style scoped>
#container {
  height: 100%;
}
</style>
