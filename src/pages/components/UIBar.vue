<template>
  <section class='grid-stack'></section>
</template>

<script>
import { ref, onMounted } from 'vue'
import GridStack from 'gridstack/dist/gridstack-h5'
import 'gridstack/dist/gridstack.css'

export default {
  setup(props, context){
    
    let grid = null;

    const items = [
      { x: 2, y: 1, h: 2 },
      { x: 2, y: 4, w: 3 },
      { x: 4, y: 2 },
      { x: 3, y: 1, h: 2 },
      { x: 0, y: 6, w: 2, h: 2 },
    ];
    items.forEach((item, i) => item.content = i);

    onMounted(() => {
      grid = GridStack.init({
        float: true,
        cellHeight: "70px",
        minRow: 1,
      });
      grid.load(items);
    });

    return {
      grid,
    };
  },
}

</script>

<style>


  .grid-stack {
    background: #FAFAD2;
  }

  .grid-stack-item-content {
    color: #2c3e50;
    text-align: center;
    background-color: #18bc9c;
  }

  .grid-stack-item-removing {
    opacity: 0.5;
  }
  .sidebar .grid-stack-item {
    width: 120px;
    height: 50px;
    border: 2px dashed green;
    text-align: center;
    line-height: 35px;
    z-index: 10;
    background: rgba(0, 255, 0, 0.1);
    cursor: default;
    display: inline-block;
  }
  .sidebar .grid-stack-item .grid-stack-item-content {
    background: none;
  }
</style>

