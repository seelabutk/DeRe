/*
  Important/Useful config attribs:
  config = {
    actor : str ['button' | 'hover' | ... ],
    type : str ['linear' | 'parrallel'], - ignore?
    description : str,
    name : str,
    parent : str,
    shape : {
      type : str ['poly'],
      points : ObjArray{
        0: {
          x : int,
          y : int,
        }
        1: {...}
        ...
      },
      dimensions: {
        centerX: int,
        centerY: int,
        min_x: int,
        max_x: int,
        min_y: int,
        max_y: int,
      },
    },
    children : ObjArray{...childrenConfigs},
*/

import loomConfig from './loomConfig.json'
import utils from './utils/utils.js'

function getFrameData(canvas, video, frame){
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL();
  return data;
}

function findUiBarTargets(targets, config){
  if(config.children === undefined) return [];
  let groups = Object.keys(config.children)
    .map(id => targets[id])
    .filter(c => Object.keys(c.shape.points).length == 4)
    .map(c => [c]);
  groups.forEach((c, i) => c[0].group = i);
  
  //horizontal bars
  const deltaY = 5;
  const gapX =  20;
  //vertical bars
  const deltaX = 5;
  const gapY = 5;
  
  for(let i = 1; i < groups.length; ++i) {
    for(let j = 0; j < i; ++j){
      const sz = groups[j].length;
      for(let k = 0; k < sz; ++k){

        const child1 = groups[i][0];
        const child2 = groups[j][k];

        if(!child1 || !child2)  continue;

        if(
          (loomConfig.mobile && loomConfig.mobile.spatialTransform && loomConfig.mobile.spatialTransform.horizontal_buttons_to_dropdown && 
           Math.abs(child1.shape.dimensions.centerY - child2.shape.dimensions.centerY) <= deltaY && //horizontal
           Math.abs(child1.shape.dimensions.min_x - child2.shape.dimensions.max_x) <= gapX) 
          || 
          (loomConfig.mobile && loomConfig.mobile.spatialTransform && loomConfig.mobile.spatialTransform.vertical_buttons_to_dropdown && 
           Math.abs(child1.shape.dimensions.min_y - child2.shape.dimensions.max_y) <= gapY && //vertical
           Math.abs(child1.shape.dimensions.centerX - child2.shape.dimensions.centerY <= deltaX))
        ){
          const ogroup = child1.group;
          groups[ogroup].forEach(c => c.group = j);
          groups[j] = groups[j].concat(groups[ogroup]);
          groups[ogroup] = [];
        }
      }
    }
  }
  groups = groups.filter(g => g.length > 1);
  return groups
}

function boundsToCircle(dims){
  const radius = (dims.max_x - dims.min_x)/2;
  const sides = Math.max(Math.ceil(Math.pow(radius, 2/3)), 5);
  const points = []
  for(let i = 0; i < sides; ++i){
    const rad = 2*Math.PI*i/sides;
    points.push({
      x: Math.sin(rad)*radius + dims.min_x + (dims.max_x - dims.min_x)/2,
      y: Math.cos(rad)*radius + dims.min_y + (dims.max_y - dims.min_y)/2,
    });
  }
  const newDims = {
    ...dims,
    min_y: dims.centerY - radius,
    max_y: dims.centerY + radius,
  }
  return [points, newDims];
}

//transform rows of buttons into mobile-friendly dropdown
function createUIBarTargets(targets, ntargets, id){
  const uiBarTargets = findUiBarTargets(targets, targets[id]);
  uiBarTargets.forEach(group => {
    let minX = Infinity;
    let maxX = 0;
    let minY = Infinity;
    let maxY = 0;

    const ngroup = group.map(() => ({}));
    for(const key in ngroup){
      ngroup[key] = {};

      minX = Math.min(group[key].shape.dimensions.min_x, minX);
      maxX = Math.max(group[key].shape.dimensions.max_x, maxX);
      minY = Math.min(group[key].shape.dimensions.min_y, minY);
      maxY = Math.max(group[key].shape.dimensions.max_y, maxY);
    }
    
    const gids = Object.values(group).map(c => c.id);
    const ngid = gids.join();

    const child = {
      actor: 'dropdown',
      type: 'linear',
      name: group.map(c => c.name).join('-'),
      id: ngid,
      parent: targets[id].name || 'root',
      parent_id: targets[id].id !== undefined ? targets[id].id : '-1',
      children: ngroup,
      frame_no: -1,
      child_visit_counter: Object.keys(ngroup).length,
      shape: {
        type: 'poly',
        points: {
          0: {x: minX, y: minY},
          1: {x: maxX, y: minY},
          2: {x: maxX, y: maxY},
          3: {x: minX, y: maxY},
        },
        dimensions: {
          min_x: minX,
          max_x: maxX,
          min_y: minY,
          max_y: maxY,
        }
      }
    };
    
    gids.forEach(gid => ntargets[gid] = { 
      hide: true,
      parent_id: child.id,
      parent: child.name,
    });

    ntargets[ngid] = child;
  });
}

//transform rectangular buttons/hover events into circular ones
function toCircleHover(targets, ntargets, id){
  const actors = ["button", "hover"];
  if(actors.includes(targets[id].actor) && targets[id].shape.points.length == 4){
    [points, dimensions] = boundsToCircle(targets[id].shape.dimensions);  
    ntargets[id].shape = {
      points, dimensions,
    };
  }
}

function traverseMobile(config, nconfig){
  const stack = [];
  stack.push('-1')

  while(stack.length){
    const id = stack.shift();
    if(nconfig[id] === null)  continue;
    
    createUIBarTargets(config, nconfig, id);  //create new UIBarTargets and modify targetData to look like UIBar
    toCircleHover(config, nconfig, id);       //change all rectangular hovers to circle clicks
    
    if(config[id].hasOwnProperty('children') && nconfig[id] !== null){
      stack.push(...Object.keys(config[id].children));
    }
  }
}

function createMobileMode(config){
  const nconfig = { 'mode': 'mobile' };
  traverseMobile(utils.shallowCopy(config), nconfig); 
  return nconfig;
}
  
export default function(instanceData, config, transform){
  if(transform == instanceData.info.mode)  return {};  //no changes required, mode already exists

  let nconfig = {};
  switch(transform){
    case 'mobile':
      nconfig.info = {mode: 'mobile'};
      nconfig.data = createMobileMode(config);
      break;
    case 'desktop': 
      break;
    default:
      break;
  }
  return nconfig;
}