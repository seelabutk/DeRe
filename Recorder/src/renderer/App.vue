<template>
  <div>
    <button @click='onClick'> click me </button>
  </div>
</template>

<script>
//import HelloWorld from './components/HelloWorld.vue'
 
export default {
  name: 'App',
  
  components: {
    //HelloWorld
  },
  
  async mounted(){
    window.ipc.on('READ_FILE', (payload) => {
      console.log(payload.content);
    });
  },

  methods: {
    readFile(path) {
      const payload = { path };
      window.ipc.send('READ_FILE', payload);
    },

    async onClick(){
      const ai = window.inspect;
      const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

      await ai.screenshot();
      console.log('move screen');
      await sleep(2000);
      await ai.screenshot();
      console.log('calcing...');
      const {contours, regions} = ai.compareScreenshots();

      console.log('contours: ', contours);
      console.log('regions: ', regions);
    },
  },
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
