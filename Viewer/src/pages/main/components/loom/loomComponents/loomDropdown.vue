<template>
  <select 
    ref="dropdown" 
    @change='onChange' 
    :style="calcStyle"
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
import utils from './utils'
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
    this.$refs.dropdown.value=this.current_state.name;
  }
}
</script>

<style scoped>
</style>