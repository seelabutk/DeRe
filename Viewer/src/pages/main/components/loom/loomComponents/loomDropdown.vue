<template>
  <select 
    ref="dropdown" 
    @change='onChange' 
    :style="calcStyle"
  >
    <option v-for="option in targetData.children"
      :key="option.id"
    >
      {{option.name}}
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
      const targetData = this.targetData.children[e.target.selectedIndex];
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