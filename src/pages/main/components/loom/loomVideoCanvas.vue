<template>
  <div ref="containerRef" style="height: 0px; width: 0px; pointer-events: auto;">
    <!-- videoCanvas polygon mask !-->
    <svg pointer-events="none">
      <clipPath :id="`clipping-${instanceID}-${targetData.id}`">
        <polygon  pointer-events="fill" :points="currentPolygonMask ? currentPolygonMaskStringScaled : null"/>
      </clipPath>
    </svg>
    <!-- positioning of canvas, cutouts, components !-->
    <div
      :style="{
        position: 'absolute',
        top: top + 'px',
        left: left + 'px',
        clipPath: `url(#clipping-${instanceID}-${id})`,
      }"
      @click=" dragging=false; emitter.emit('clickVideoCanvas'); "
      @mousedown="onVideoMouseDown"
      @mouseleave="dragging=false"
    >
      <!-- canvas element to redraw video !-->
      <div>
        <canvas
          ref="canvasRef"
          :width="width"
          :height="height"
          :style="{
            width: (width*scale.x).toPrecision(4) + 'px',
            height: (height*scale.y).toPrecision(4) + 'px',
          }"
        />
        <!-- drag selection !-->
        <div :style="dragSelectStyle"/>
        <!-- hints overlay !-->
        <div 
          class='overlay'
          :style='{display: overlay ? "block" : "none"}'
          style="position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5);"
        />
      </div>
      <!-- relative positioning of components !-->
      <div
        class="offset"
        :style="{
          position: 'absolute',
          top: '0px',
          left: '0px',
        }"
      >
        <!-- interactive loom objects !-->
        <component 
          v-for="target in currentTargets"
          :key="target.id" 
          :is="getComponent(target)" 
          :ref="el => { if(el) componentRefs[target.id] = el }"
          :targetData="target"
          :vcTargetData="targetData"
          :targets="targets"
          :showHint="overlay"
          :interactable="!regionSelect"
          @change-state="changeState"
          @add-history="addHistory"
        />
      </div>
      <!-- cutouts to mask interaction regions !-->
      <svg 
        v-for="(cutout,id) in targetData.cutouts"
        :key="id"
        :width="(width*scale.x).toPrecision(4)"
        :height="(height*scale.y).toPrecision(4)"
        :style="{
          width: (width*scale.x).toPrecision(4),
          height: (height*scale.y).toPrecision(4),
          top: '0px',
          left: '0px',
          position: 'absolute',
          fill: 'black',
        }"
        pointer-events='none'
      >
        <polygon pointer-events="fill" :points="utils.polyToPolyString(utils.scalePolygon(cutout.poly, scale), 0, 0)"/>
      </svg>
    </div>
  </div>
</template>

<script>
import utils from './utils/utils.js'
import loomConfig from './loomConfig.json'
import loomBrushingBox from './loomComponents/loomBrushingBox.vue'
import loomButton from './loomComponents/loomButton.vue'
import loomHover from './loomComponents/loomHover.vue'
import loomDropdown from './loomComponents/loomDropdown.vue'
import loomUSA from './loomComponents/loomUSA.vue'
import { ref, toRefs, reactive, onMounted, onBeforeUnmount, computed, provide, inject, watch, watchEffect, getCurrentInstance } from 'vue'

export default {
  name: 'loomVideoCanvas',
  emits: ['frame_processed'],
  props: ['regionSelect', 'overlay', 'renderMode', 'renderAppMode', 'dragMode', 'info', 'targets', 'targetData', 'instanceID', 'start_state_id'],
  components: { loomButton, loomHover, loomDropdown, loomBrushingBox, loomUSA },
  setup(props, context){
    //globals
    const manager = inject('manager');
    const vueInstance = getCurrentInstance();
    const emitter = inject("emitter");
    const {loomVideoCanvasRefs} = inject(`instance-${props.instanceID}`);
    const instanceRef = manager.appRefs[props.instanceID];


    //videoCanvas data
    const scale = ref({ x: 1.0, y: 1.0 }); 
    const containerRef = ref(null);
    const canvasRef = ref(null);
    const videoCanvasRef = computed(() => { return loomVideoCanvasRefs[id.value]; });
    const id = computed(() => { return props.targetData.id; });
    const page = computed(() => { return props.targetData.page; });
    const mode = computed(() => { return props.renderAppMode; }); 
    const width = computed(() => { return props.targetData.width || props.info.window.width; });
    const scaledWidth = computed(() => { return width * scale.x; });
    const height = computed(() => { return props.targetData.height || props.info.window.height; });
    const scaledHeight = computed(() => { return height * scale.y; });
    const top = computed(() => { return props.targetData.top || 0 });
    const left = computed(() => { return props.targetData.left || 0 });
    const parentCanvasRef = computed(() => { return loomVideoCanvasRefs[props.targetData.parentCanvas] || false; });


    //polygon mask
    const polygonMasks = reactive({});
    const polygonReshapeIdx = ref(-1);
    const reshapePolygonMode = ref(false);
    const resizePolygonMode = ref(false);
    const currentPolygonMask = computed(() => { return polygonMasks[currentPolygonMaskID.value]; });
    const currentPolygonMaskScaled = computed(() => { return utils.scalePolygon(currentPolygonMask.value, scale.value); });
    const currentPolygonMaskString = computed(() => { return utils.polyToPolyString(currentPolygonMask.value, 0, 0); });
    const currentPolygonMaskStringScaled = computed(() => { return utils.polyToPolyString(currentPolygonMaskScaled.value, 0, 0); });
    const currentPolygonMaskID = computed(() => {
      for(let cs = current_state.value; cs && cs.parent_id != cs.id; cs = props.targets[cs.parent_id]){
        if(polygonMasks[cs.id]) return cs.id;
      }
      return -1;
    });
    const resizePolygon = () => {
      const delta = { 
        x: mouseLoc.value.x - lastMouseLoc.value.x, 
        y: mouseLoc.value.y - lastMouseLoc.value.y 
      };
      const oscale = scale.value;
      scale.value = {                             
        x: (scale.value.x*width.value + delta.x)/width.value,
        y: (scale.value.y*height.value + delta.y)/height.value,
      };
      const dscale = {  //difference in scales
        x: oscale.x - scale.value.x,
        y: oscale.y - scale.value.y,
      };
      props.targetData.scale = scale.value;
      const bbox = utils.boundingBox(currentPolygonMask.value);
      props.targetData.left += dscale.x*bbox.xmin;
      props.targetData.top += dscale.y*bbox.ymin;
      redraw();
    };
    const reshapePolygon = (e) => {
      const minD = 10;
      const c = polygonReshapeIdx.value;
      const n = currentPolygonMask.value.length;
      const nidx = (c+1)%n;
      const pidx = ((c-1)%n+n)%n;
      if(utils.dist(currentPolygonMask.value[c], currentPolygonMask.value[nidx]) < minD 
      || utils.dist(currentPolygonMask.value[c], currentPolygonMask.value[pidx]) < minD){
        currentPolygonMask.value.splice(c, 1);
        reshapePolygonMode.value = false;
        redraw();
        return;
      }
      e.x = utils.bound(e.x, 0, width.value*scale.value.x);
      e.y = utils.bound(e.y, 0, height.value*scale.value.y);
      currentPolygonMask.value[c] = { x: e.x/scale.value.x, y: e.y/scale.value.y };
      const pc = parentCanvasRef.value;
      if(!pc){
        redraw(); 
        return;
      }
      const pcutouts = pc.targetData.cutouts;
      const cidx = pcutouts.findIndex(c => c.id == props.targetData.id);
      if(cidx >= 0){
        const newCutout = pcutouts[cidx];
        newCutout.poly = currentPolygonMask.value;
        pcutouts.splice(cidx, 1, newCutout);
      }
      redraw();
    };
    const addNewVertex = (vertIdx, e) => {
      currentPolygonMask.value.splice(vertIdx+1, 0, {x: e.x/scale.value.x, y: e.y/scale.value.y});
      reshapePolygonMode.value = true;
      polygonReshapeIdx.value = vertIdx+1;
      redraw();
    };
    const isPolygonVertexHovered = (e) => {
      if(!props.regionSelect) return -1;
      const thickness = 2;
      const boxSize = 8;
      const bs = Math.ceil(boxSize/2 + thickness/2);
      const paths = currentPolygonMaskScaled.value.map(pm => {
        let dx = 0, dy = 0;
        if(bs > pm.x) dx = -(pm.x-bs);
        else if(scaledWidth.value < pm.x+bs) dx = scaledWidth.value - (pm.x+bs);
        if(bs > pm.y) dy = -(pm.y-bs);
        else if(scaledHeight.value < pm.y+bs) dy = scaledHeight.value - (pm.y+bs);
        const square = [{x: pm.x+dx-bs, y: pm.y+dy-bs}, {x: pm.x+dx+bs, y: pm.y+dy-bs}, {x: pm.x+dx+bs, y: pm.y+dy+bs}, {x: pm.x+dx-bs, y: pm.y+dy+bs}];
        return utils.polyToPath2D(square);
      });
      return paths.findIndex(path => ctx.value.isPointInPath(path, e.x, e.y));
    };
    const isPolygonLineHovered = (e) => {
      if(!props.regionSelect) return -1;
      const lines = currentPolygonMaskScaled.value.map((pm, i, pms) => {
        const nidx = (i+1)%pms.length;
        const pn = pms[nidx];
        return utils.polyToPath2D([pm, pn]);
      });
      return lines.findIndex(line => ctx.value.isPointInStroke(line, e.x, e.y));
    };
    const drawPolyOutline = (ctx, poly) => {
      const color = '#ff0000';
      const thickness = 2;
      const boxSize = 8;
      ctx.lineWidth = thickness;
      ctx.strokeStyle = color;
      let square = (function(xp, yp){
        const bs = Math.ceil(boxSize/2 + thickness/2);
        ctx.strokeRect(utils.bound(xp, bs, width.value-bs)-bs, utils.bound(yp, bs, height.value-bs)-bs, boxSize, boxSize);
      }).bind(videoCanvasRef.value);

      ctx.beginPath();
      ctx.moveTo(utils.bound(poly[0].x, thickness/2, width.value-thickness/2), utils.bound(poly[0].y, thickness/2, height.value-thickness/2));
      for(let i = 1; i < poly.length; ++i){
        ctx.lineTo(utils.bound(poly[i].x, thickness/2, width.value-thickness/2), utils.bound(poly[i].y, thickness/2, height.value-thickness/2));
      }
      ctx.closePath();
      ctx.stroke();
      poly.forEach(p => square(p.x, p.y));
    };


    //events
    const dragStart = ref({x: 0, y: 0});
    const dragCurr = ref({x: 0, y: 0});
    const lastMouseLoc = ref({x: 0, y: 0});
    const mouseLoc = ref({x: 0, y: 0});
    const selected = ref(false);
    const dragging = ref(false);
    const { dragMode } = toRefs(props);
    const dragSelectStyle = computed(() => {
      const top = Math.min(dragStart.value.y, dragCurr.value.y) + 'px';
      const left = Math.min(dragStart.value.x, dragCurr.value.x) + 'px';
      const width = Math.abs(dragCurr.value.x - dragStart.value.x) + 'px';
      const height = Math.abs(dragCurr.value.y - dragStart.value.y) + 'px';
      return {
        position: 'absolute',
        'display': regionExists.value ? 'block' : 'none',
        'background-color': 'rgba(0, 0, 0, 0.5)',
        'border-style': 'dashed',
        'pointer-events': 'none',
        top, left, width, height,
      };
    });
    watch(dragMode, (v) => { redraw(); });
    const clientToOffset = (e) => {
      const {left, top} = containerRef.value.getBoundingClientRect();
      return {x: e.clientX - left - props.targetData.left, y: e.clientY - top - props.targetData.top};
    };
    const onScreenMouseMove = (e) => {
      lastMouseLoc.value = mouseLoc.value;
      mouseLoc.value = clientToOffset(e);
      if(reshapePolygonMode.value){
        reshapePolygon(mouseLoc.value);
        return;
      } else if(resizePolygonMode.value && props.targetData.resizeable !== false){
        resizePolygon();
        return;
      } else if(!dragMode.value && props.targetData.reshapeable !== false || props.targetData.resizeable !== false) {
        if(isPolygonVertexHovered(mouseLoc.value) >= 0){
          document.body.style.cursor = 'move';
        } else if(isPolygonLineHovered(mouseLoc.value) >= 0) {
          document.body.style.cursor = 'crosshair';
        }
      }
      if(!selected.value)  return;
      if(!dragging.value)  return;
      if(props.targetData.movable === false)  return;
      dragCurr.value = mouseLoc.value;
      if(dragMode.value){
        props.targetData.top += e.movementY;
        props.targetData.left += e.movementX;
      }
    };
    const onScreenMouseDown = (e) => {
      const mouseLoc = clientToOffset(e);
      const shift = e.shiftKey;
      if(props.targetData.reshapeable !== false || props.targetData.resizeable !== false){
        const reshapePoly = isPolygonVertexHovered(mouseLoc);
        if(reshapePoly >= 0 && !dragMode.value){
          if(shift && props.targetData.resizeable !== false){
            resizePolygonMode.value = true;
          } else if(props.targetData.reshapeable !== false) {
            resizePolygonMode.value = false;
            reshapePolygonMode.value = true;
            polygonReshapeIdx.value = reshapePoly;
          }
        }
        if(reshapePoly < 0 && props.targetData.reshapeable !== false){
          const newVertex = isPolygonLineHovered(mouseLoc);
          if(newVertex >= 0){  
            addNewVertex(newVertex, mouseLoc);
            redraw();
          }
        }
      }
    };
    const onVideoMouseDown = (e) => {
      document.body.style.cursor = 'default';
      selected.value = true;
      mouseLoc.value = clientToOffset(e);
      if(!dragMode.value){
        dragCurr.value = dragStart.value = mouseLoc.value;
      }else{
        dragCurr.value = dragStart.value = {x: -10000, y: -10000};
      }
      emitter.emit('deselect');
      selected.value = true;
      emitter.emit("selectVideoCanvas", videoCanvasRef.value);
      dragging.value = props.regionSelect;
      return false;
    };
    const onScreenMouseUp = (e) => {
      dragging.value = false;
      selected.value = false;
      resizePolygonMode.value = false;
      reshapePolygonMode.value = false;
      document.body.style.cursor = 'default';
    };
    const clearSelection = () => {
      dragging.value = false;
      dragStart.value = dragCurr.value = {x: -10000, y: -10000};
    };
    const deselect = () => { selected.value = false; };


    //regions
    const regionExists = computed(() => {
      if(dragMode.value || !props.regionSelect)  return false;
      if(
        dragStart.value.x == -10000 ||
        dragStart.value.y == -10000 ||
        dragCurr.value.x == -10000  ||
        dragCurr.value.y == -10000
      ) return false;
      if(
        Math.abs(dragCurr.value.x - dragStart.value.x) < 5 ||
        Math.abs(dragCurr.value.y - dragStart.value.y) < 5
      ) return false;
      return true;
    });
    watch(regionExists, (v) => { emitter.emit('regionExists', {exists: v, origin: videoCanvasRef.value}); });
    const cutSelectedRegion = () => {
      if(dragStart.value.x > dragCurr.value.x)  [dragStart.value.x, dragCurr.value.x] = [dragCurr.value.x, dragStart.value.x];
      if(dragStart.value.y > dragCurr.value.y)  [dragStart.value.y, dragCurr.value.y] = [dragCurr.value.y, dragStart.value.y];
      cutRegions(utils.rectToPoly({
        x: dragStart.value.x,
        y: dragStart.value.y,
        width: dragCurr.value.x - dragStart.value.x, 
        height: dragCurr.value.y - dragStart.value.y
      }));
      dragStart.value = dragCurr.value = {x: -10000, y: -10000};
    };
    const copyRegions = (regions, copyUI = true) => { cutRegions(regions, false, copyUI); };
    const cutRegions = (regions, cutout = true, copyUI = true) => { 
      if(regions.length > 0 && !props.targetData.parentCanvas){ // auto-new page - create new loomVideoCanvas component
        instanceRef.newVideoTarget({
          parentCanvas: props.targetData.id, 
          startupFn: c => {
            c.cutRegions(regions, cutout, copyUI);
            c.emitter.emit('deselect');
            delete c.targetData.startupFn;
          },
          processed: true,
        });
        return;
      }
      if(regions.length > 0 && regions[0].constructor !== Array) regions = [regions];
      regions.forEach((region) => {
        const id = String(Object.keys(instanceRef.currentVideoTargets).length);
        instanceRef.currentVideoTargets[id] = {
          page: props.targetData.page,
          id,
          current_state_id: current_state.value.id,
          region,
          top: props.targetData.top,
          left: props.targetData.left,
          makeCutout: cutout,
          parentCanvas: props.targetData.id,
          cutouts: [],
          startupFn: c => {
            c.emitter.emit('deselect');
            delete c.targetData.startupFn;
          },
          processed: true,
        };
      });
    };


    //drawing
    const ctx = ref(null);
    const redraw = (emit=false) => { emitter.emit('changeVideoFrame', [props.instanceID, page.value, id.value, lastFrame.value, emit]); };
    const draw = (videoPlayer, emit = true) => {
      if(throttle.value || !videoPlayer) return;
      ctx.value.restore();
      ctx.value.save();
      ctx.value.fillStyle = "rgba(0, 0, 0, 0)";
      ctx.value.clearRect(0, 0, width.value, height.value);
      if(props.targetData.drawImage !== false){
        const xVideoRatio = videoPlayer.videoWidth/videoPlayer.clientWidth;
        const yVideoRatio = videoPlayer.videoHeight/videoPlayer.clientHeight;
        ctx.value.drawImage(videoPlayer, 0, 0, 
          width.value*xVideoRatio, height.value*yVideoRatio, 
          0, 0, width.value, height.value
        );
      }
      if(!dragMode.value && currentPolygonMask.value){
        drawPolyOutline(ctx.value, currentPolygonMask.value);
      }
      if(emit) emitter.emit('post_redraw' + props.targetData.id)
      processFrame();
      throttle.value = true;
      setTimeout(() => throttle.value=false, 20);
    };
    const processFrame = () => {
      if(props.targetData.processed || !canvasRef.value) return;
      const src = cv.imread(canvasRef.value);
      cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
      cv.threshold(src, src, 254, 255, cv.THRESH_BINARY);
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(src, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
      //correct hierarchy data layout
      const arrs = [];
      const harr = Array.from(hierarchy.data32S);
      while(harr.length > 0) arrs.push(harr.splice(0, 4));
      //get top-level regions with children
      const regions = [];
      arrs.forEach((h, i) => { if(h[2] != -1 && h[3] == -1)  regions.push(i); });
      function isOverlapped(rect0, rect1){
        const r0 = {left: rect0.x, top: rect0.y, right: rect0.x + rect0.width, bottom: rect0.y + rect0.height};
        const r1 = {left: rect1.x, top: rect1.y, right: rect1.x + rect1.width, bottom: rect1.y + rect1.height};
        return !(r1.left > r0.right || r1.right < r0.left || r1.top > r0.bottom || r1.bottom < r0.top);
      }
      const rects = regions.filter(key => cv.contourArea(contours.get(parseInt(key)), false) > 1000)         // filter by area 
      .map(key => cv.boundingRect(contours.get(parseInt(key))))                                              // get bounding boxes
      .sort((a, b) => a.width * a.height > b.width * b.height)                                               //sort by area
      .filter((rect, i, rects) => !rects.slice(i+1).some((r)=>isOverlapped(r, rect)))                        // filter out overlapping rects
      .filter(rect => Math.abs(width.value - rect.width) > 100 && Math.abs(height.value - rect.height) > 100)  // filter out rects that try and crop too much of the screen out
      .map(utils.rectToPoly);
      if(rects.length != 0) cutRegions(rects, true, true, false);
      src.delete(); contours.delete(); hierarchy.delete();
      context.emit('frame_processed');
    };


    //frame changing
    const lastFrame = ref(null);
    const throttle = ref(false);
    const updateParentCurrentState = ref(true);
    const changeState = (target_id, offset = 0, changeParent=true, emit=true) => {
      changeStateWithFrameNo(props.targets[target_id].frame_no, offset, changeParent, emit);
    };
    const changeStateWithFrameNo = (frame, offset=0, changeParent=true, emit=true) => {
      const actualFrame = frame + 1 + offset;
      if(lastFrame.value == actualFrame) return;
      lastFrame.value = actualFrame;
      if(changeParent && updateParentCurrentState.value) instanceRef.changeStateWithFrameNo(frame, offset);
      props.targetData.current_state_id = Object.values(props.targets).find(o => o.frame_no == frame).id;
      redraw(emit);
    };
    const addHistory = (t, e) => { instanceRef.updateInteractionHistory(t, e, props.targetData.id); };


    //components
    const componentRefs = reactive({});
    const current_state = computed(() => { return Object.values(props.targets).find(t => t.id == props.targetData.current_state_id) || Object.values(props.targets).sort((a,b) => a.frame_no - b.frame_no)[0]; });
    const currentTargets = computed(() => { return utils.currentTargets(current_state.value, props.targets); });
    const getComponent = (target) => {
      if(target.id == '-1') return undefined;
      const loomObjectName = `loom${target.actor.charAt(0).toUpperCase() + target.actor.slice(1)}`;
      if(loomConfig[props.renderAppMode] && loomConfig[props.renderAppMode].mappings){
        const componentName = loomConfig[props.renderAppMode].mappings[loomObjectName];
        if(componentName && vueInstance.components[componentName])
          return vueInstance.components[componentName];
      }
      if(vueInstance.components[loomObjectName])      //defaults
        return vueInstance.components[loomObjectName];
      return undefined;
    };

    
    onMounted(() => {
      ctx.value = canvasRef.value.getContext('2d');
      ctx.value.save();

      if(page.value == instanceRef.currentPage && props.start_state && props.start_state.id !== undefined){
        props.targetData.current_state_id = props.start_state_id;
      }
      if(current_state.value !== undefined){
        changeState(current_state.value.id, 0, false);
        if(props.targetData.region){
          polygonMasks[currentPolygonMaskID.value] = props.targetData.region;
        } else {
          polygonMasks[currentPolygonMaskID.value] = [
            {x: 0, y: 0},
            {x: width.value, y: 0},
            {x: width.value, y: height.value},
            {x: 0, y: height.value}
          ];
        }
        if(props.targetData.makeCutout && instanceRef){
          const region = currentPolygonMask.value;
          const minX = Math.min(...region.map(p => p.x));
          const maxX = Math.max(...region.map(p => p.x));
          const minY = Math.min(...region.map(p => p.y));
          const maxY = Math.max(...region.map(p => p.y));
          const pcutouts = parentCanvasRef.value.targetData.cutouts;
          pcutouts.push({
            poly: currentPolygonMask.value,
            width: maxX-minX,
            height: maxY-minY,
            top: minY,
            left: minX,
            id: props.targetData.id,
          });
        }
      }
      if(props.targetData.startupFn) {
        props.targetData.startupFn(videoCanvasRef.value);
      }
      emitter.on('clearSelection', clearSelection);
      emitter.on('deselect', deselect);
      emitter.on(`changeState-${props.targetData.id}`, changeState);
      emitter.on('mousemove', onScreenMouseMove);
      emitter.on('mouseup', onScreenMouseUp);
      emitter.on('mousedown', onScreenMouseDown);
      selected.value = true;
      emitter.emit("selectVideoCanvas", videoCanvasRef.value);
    });


    onBeforeUnmount(() => {
      //delete cutouts
      if(parentCanvasRef.value && parentCanvasRef.value.targetData){
        const id = parentCanvasRef.value.targetData.cutouts.findIndex(c => c.id === props.targetData.id);
        if(id >= 0) parentCanvasRef.value.targetData.cutouts.splice(id, 1);
      }
      //delete event listeners
      emitter.off('clearSelection', clearSelection);
      emitter.off('deselect', deselect);
      emitter.off(`changeState-${props.targetData.id}`, changeState);
      emitter.off('mousemove', onScreenMouseMove);
      emitter.off('mouseup', onScreenMouseUp);
      emitter.off('mousedown', onScreenMouseDown);
    });

    
    const videoCanvas = {
      utils,

      selected,
      dragStart,
      dragCurr,
      lastMouseLoc,
      mouseLoc,
      dragging,
      reshapePolygonMode, 
      resizePolygonMode,
      ctx, 
      polygonMasks,
      polygonReshapeIdx,
      updateParentCurrentState,
      lastFrame,
      throttle,
      dragMode,
      scale,
      //refs
      loomVideoCanvasRefs,
      componentRefs,
      instanceRef,
      canvasRef,
      containerRef,
      //computed
      current_state,
      currentTargets,
      id,
      page,
      mode,
      width,
      scaledWidth,
      height,
      scaledHeight,
      top,
      left,
      parentCanvasRef,
      currentPolygonMaskID,
      currentPolygonMask,
      currentPolygonMaskScaled,
      currentPolygonMaskString,
      currentPolygonMaskStringScaled,
      regionExists,
      dragSelectStyle,
      //methods
      getComponent,
      changeState,
      changeStateWithFrameNo,
      addHistory,
      cutSelectedRegion,
      copyRegions,
      cutRegions,
      resizePolygon,
      reshapePolygon,
      addNewVertex,
      isPolygonVertexHovered,
      isPolygonLineHovered,
      clientToOffset,
      onScreenMouseMove,
      onScreenMouseDown,
      onVideoMouseDown,
      onScreenMouseUp,
      drawPolyOutline,
      redraw,
      draw,
      processFrame,
      clearSelection,
      deselect,
    };
    provide(`videoCanvas-${id}`, videoCanvas);
    return videoCanvas;
  },
};
</script>