<template>
  <select @change='onChange' :style="calcStyle">
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
  name: 'loomButton',
  mixins: [loomBase],
  methods: {
    onChange(e){
      const targetData = this.targetData.children[e.target.selectedIndex];
      this.$emit('changeState', targetData);
      this.$emit('addHistory', targetData, e)
    },
  },
}
</script>

<style scoped>
</style>