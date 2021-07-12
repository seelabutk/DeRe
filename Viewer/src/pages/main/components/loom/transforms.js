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
      points : Array[{
        x : int,
        y : int,
      }],
      dimensions: {
        centerX: int,
        centerY: int,
        min_x: int,
        max_x: int,
        min_y: int,
        max_y: int,
      },
    },
    children : Array[config],
*/

import loomConfig from './loomConfig.json'
//todo: make accessing potentially unset loomConfig options less difficult 

function getFrameData(canvas, video, frame){
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL();
  return data;
}

function findUiBarTargets(config){
  if(!config.hasOwnProperty('children'))  return [];
  let groups = config.children.filter(c => c.shape.points.length == 4).map(c => [c]);
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
  return groups;
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

function traverseMobile(config){

  let children = config.children;

  //transform rows of buttons into mobile-friendly dropdown
  const uiBarTargets = findUiBarTargets(config);
  uiBarTargets.forEach(group => {
    const nconfig = {}
    nconfig.actor = 'dropdown';
    nconfig.type = 'linear';
    nconfig.name = group.map(c => c.name).join('-');
    nconfig.description = group.map(c => c.description).join(':')
    nconfig.id = group[0].id;
    nconfig.parent = config.name;
    nconfig.parent_id = config.id;
    nconfig.children = group;
    nconfig.frame_no = -1;
    nconfig.child_visit_counter = group.length;
    const gids = group.map(c => c.id);
    config.children = config.children.filter(c => !gids.includes(c.id));
    config.children.push(nconfig);
    config.child_visit_counter = config.children.length;
    children = group;

    let minX = Infinity;
    let maxX = 0;
    let minY = Infinity;
    let maxY = 0;

    for(const target of group){
      target.parent = nconfig.name;
      target.parent_id = nconfig.id;
      target.hide = true;
      minX = Math.min(target.shape.dimensions.min_x, minX);
      maxX = Math.max(target.shape.dimensions.max_x, maxX);
      minY = Math.min(target.shape.dimensions.min_y, minY);
      maxY = Math.max(target.shape.dimensions.max_y, maxY);
    }
    nconfig.shape = {};
    nconfig.shape.type = 'poly';
    nconfig.shape.points = [
      {x: minX, y: minY},
      {x: maxX, y: minY},
      {x: maxX, y: maxY},
      {x: minX, y: maxY},
    ];
    nconfig.shape.dimensions = {
      min_x: minX,
      max_x: maxX,
      min_y: minY,
      max_y: maxY,
    };
  });

  //transform rectangular buttons/hover events into circular ones
  const actors = ["button", "hover"];
  if(actors.includes(config.actor) && config.shape.points.length == 4){
    [config.shape.points, config.shape.dimensions] = boundsToCircle(config.shape.dimensions);
    return;
  }


  children && children.forEach(child => {
    traverseMobile(child);
  });
}

// note: since we're working with objects, values will be copied by REFERENCE,
// not by value, so no return values are needed in the traversal functions
export default function(config, targets, mode){
  const canvas = document.createElement('canvas');
  canvas.width = config.window.width;
  canvas.height = config.window.height;

  switch(mode){
    case 'mobile':
      config['mode'] = 'mobile';
      traverseMobile(config);
      break;
    case 'desktop': //no traversal necessary, app already in desktop mode
      break;
    default:
      break; 
  }
  return config;
}