/*
  Important/Useful config attribs:
  config = {
    actor : str ['button' | 'hover' | ... ]
    type : str ['linear' | 'parrallel'] - ignore?
    description : str
    name : str
    parent : str
    shape : {
      type : str ['poly']
      points : [
        {
          x : int
          y : int
        }
        ...     
      ]
      dimensions: {
        centerX: int
        centerY: int
        min_x: int
        max_x: int
        min_y: int
        max_y: int
      }
    }
*/

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

  if(config.name !== "root"){
    //modify current level
    if(config.actor == "button"){
      [config.shape.points, config.shape.dimensions] = boundsToCircle(config.shape.dimensions);
    }

  }

  config.hasOwnProperty('children') && config.children.forEach(child => {
    traverseMobile(child);
  });
}

// note: since we're working with objects, values will be copied by REFERENCE,
// not by value, so no return values are needed in the traversal functions
export default function(config, mode){
  switch(mode){
    case 'mobile':
      traverseMobile(config);
      break;
    default:
      break; 
  }
  return config;
}