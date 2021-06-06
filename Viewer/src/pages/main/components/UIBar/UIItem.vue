<template>
  <div 
    class="grid-stack-item"
    v-on="eventData"
  >
    <div class="grid-stack-item-content">
      {{content}}
    </div>
  </div>
</template>

<script>
export default {
  props: ['itemData'],
  name: 'UIItem',
  data: function(){
    return {
      content: null
    };
  },

  created(){
    this.content = this.itemData.content;
  },

  methods: {
  
  }
}
</script>

<style scoped>

 .grid-stack-item-content {
    color: rgb(204,204,204);
    text-align: center;
    background-color: rgb(45,45,45)
  }

  

</style>