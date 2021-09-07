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
import utils from './loomComponents/utils'

function getFrameData(canvas, video, frame){
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL();
  return data;
}

function findUiBarTargets(config){
  if(!config.hasOwnProperty('children'))  return [];
  let groups = Object.values(config.children).filter(c => Object.keys(c.shape.points).length == 4).map(c => [c]);
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
function createUIBarTargets(config, nconfig){
  const uiBarTargets = findUiBarTargets(config);
  uiBarTargets.forEach(group => {

    let minX = Infinity;
    let maxX = 0;
    let minY = Infinity;
    let maxY = 0;
    const ngroup = group.map(g => utils.shallowCopy(g));
    for(const target of ngroup){
      target.parent = nconfig.name;
      target.parent_id = nconfig.id;
      target.hide = true;
      minX = Math.min(target.shape.dimensions.min_x, minX);
      maxX = Math.max(target.shape.dimensions.max_x, maxX);
      minY = Math.min(target.shape.dimensions.min_y, minY);
      maxY = Math.max(target.shape.dimensions.max_y, maxY);
    }

    const child = {
      actor: 'dropdown',
      type: 'linear',
      name: group.map(c => c.name).join('-'),
      id: group[0].id, //todo: probably needs new uuid
      parent: config.name,
      parent_id: config.id,
      children: group,
      frame_no: -1,
      child_visit_counter: Object.keys(group).length,
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

    const gids = Object.values(group).map(c => c.id);
    nconfig.children[gids.join()] = child;
  });
}

//transform rectangular buttons/hover events into circular ones
function toCircleHover(config, nconfig){
  const actors = ["button", "hover"];
  if(actors.includes(config.actor) && config.shape.points.length == 4){
    if(!nconfig.shape) nconfig = utils.shallowCopy(config);
    [nconfig.shape.points, nconfig.shape.dimensions] = boundsToCircle(config.shape.dimensions);  
  }
  return nconfig;
}

function traverseMobile(config, nconfig){
  nconfig.children = {};
  createUIBarTargets(config, nconfig);
  nconfig = toCircleHover(config, nconfig);

  config.children && Object.keys(config.children).forEach(key => {
    nconfig.children[key] = nconfig.children[key] || {};
    traverseMobile(config.children[key], nconfig.children[key]);
  });
}

function createMobileMode(config){
  const nconfig = utils.shallowCopy(config);
  nconfig.mode = 'mobile';
  traverseMobile(config, nconfig); 
  return nconfig;
}
  
export default function(config, transform){
  if(transform == config['original'].mode){
    return {};  //no changes required, mode already exists
  }

  switch(transform){
    case 'mobile':
      return createMobileMode(config['original']);
    case 'desktop': 
      return {} //todo
    default:
      return {};
  }
}