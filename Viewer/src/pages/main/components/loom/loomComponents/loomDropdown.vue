<template>
  <select 
    ref="dropdown" 
    :id="componentID"
    :style="calcStyle"
    @change='onChange' 
  >
    <option v-for="id in Object.keys(targetData.children)"
      :key="id"
    >
      {{targets[id].name}}
    </option>
  </select>
</template>

<script>
import loomBase from './loomBase'
export default {
  name: 'loomDropdown',
  mixins: [loomBase],
  methods: {
    onChange(e){
      const targetData = this.targets[Object.keys(this.targetData.children)[e.target.selectedIndex]];
      this.$emit('changeState', targetData.id);
      this.$emit('addHistory', targetData, e)
    },
  },
  mounted(){
    this.$nextTick(() =>{
      this.$refs.dropdown.value = this.$parent.current_state.name;
    });
  }
}
</script>

<style scoped>
</style>