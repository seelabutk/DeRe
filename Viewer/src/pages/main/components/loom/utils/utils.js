function currentTargets(current_state, targets){
  if(!current_state) return {};
  const cts = objectFilter(targets, target => {
    return target.hide != true &&
     target.id != '-1' && 
     (
      isChild(current_state, target) ||
      isSibling(targets, target, current_state) ||
      target.parent_id == '-1'
    ) || target.important;
  });
  return cts;
}
function isChild(cs, target){
  if (!(cs && cs.hasOwnProperty("children"))) return false;
  return Object.keys(cs.children).includes(String(target.id));
}
function isSibling(targets, target1, target2){
  return isChild(targets[target2.parent_id], target1);
}

function objectFilter(obj, fn){
  const ret = {};
  Object.keys(obj).filter(key => fn(obj[key])).forEach(key => ret[key] = obj[key]);
  return ret;
}

function arrayToObject(arr){
  const obj = {};
  arr.forEach((el, i) => obj[i] = el);
  return obj;
}

function shallowCopy(obj){
  const nobj = {};
  Object.entries(obj).forEach(([key, value]) => {
    nobj[key] = value;
  });
  return nobj;
}

function shallowCopyPrimitivesOnly(obj, filler=undefined){
  const nobj = {};
  Object.keys(obj).forEach(key => {
    if(obj[key] !== Object(obj[key])){
      nobj[key] = obj[key];
    } else if(filler !== undefined){
      nobj[key] = filler;
    }
  });
  return nobj;
}

function deepCopy(obj){
  if(typeof obj === 'object' && obj !== null){
    if(obj.constructor === Array){
      const ret = [];
      obj.forEach(val => {
        ret.push(deepCopy(val));
      });
      return ret;
    }else{
      const ret = {}
      Object.entries(obj).forEach(([key, val]) => {
        ret[key] = deepCopy(val);
      });
      return ret;
    }
  }
  return obj;
}

function deepMerge(obj1, obj2){
  const cobj1 = deepCopy(obj1);
  const cobj2 = deepCopy(obj2);

  return (function merge(obj1, obj2){
    let merged = {};
    [...new Set(Object.keys(obj1).concat(Object.keys(obj2)))].forEach(key => {
      if(obj2[key] === null){
        //don't merge, do nothing
      }else if(obj2[key] === undefined        // if undefined
       || Object.keys(obj2[key]).length == 0  // if empty object
       || obj1[key] !== Object(obj1[key])     // if obj1 primitive
       || obj2[key] !== Object(obj2[key])     // if obj2 primitive
       ){ 
        merged[key] = obj2[key] !== undefined ? obj2[key] : obj1[key];
      }else{
        merged[key] = merge(obj1[key], obj2[key]);
      }
    });
    return merged;
  })(cobj1, cobj2);
}

function absdiff(img1, img2){
  const img = [];
  for (let i = 0; i < img1.rows; i++) {
    for (let j = 0; j < img1.cols; j++) {
      const color1 = Array.from(img1.ucharPtr(i, j)).slice(0, 3);
      const color2 = Array.from(img2.ucharPtr(i, j));
      const colors = color1.map((c1, i) => [c1, color2[i]]);
      colors.forEach(c => img.push(Math.abs(c[1] - c[0])));
    }
  }
  return img;
}

function scalePolygon(poly, scale){
  poly.forEach(p => {p.x *= scale.x; p.y *= scale.y});
}

function polyToPath2D(poly){
  let str = '';
  str += `M ${poly[0].x} ${poly[0].y} `;
  for(let i = 1; i < poly.length; ++i){
    str += `L ${poly[i].x} ${poly[i].y} `;
  }
  str += `L ${poly[0].x} ${poly[0].y} `;
  return new Path2D(str);
}

function polyToPolyString(poly, minX, minY){
  if(minX === undefined) minX = Math.min(...poly.map(p => p.x));
  if(minY === undefined) minY = Math.min(...poly.map(p => p.y));
  let polyString = ''
  poly.forEach((p, i) => {
    polyString += p.x - minX + "," + (p.y - minY);
    if (i !== poly.length - 1) polyString += " ";
  });
  return polyString;
}

function rectToPoly(rect){
  return [
    {x: rect.x, y: rect.y},
    {x: rect.x + rect.width, y: rect.y},
    {x: rect.x + rect.width, y: rect.y + rect.height},
    {x: rect.x, y: rect.y + rect.height},
  ];
}

function boundingBox(poly){
  let xmin = Infinity;
  let xmax = 0;
  let ymin = Infinity
  let ymax = 0;
  poly.forEach(p => {
    xmin = Math.min(xmin, p.x);
    xmax = Math.max(xmax, p.x);
    ymin = Math.min(ymin, p.y);
    ymax = Math.max(ymax, p.y);
  })
  return {xmin, xmax, ymin, ymax};
}

function bound(v, min, max){
  return Math.min(Math.max(min, v), max);
}

function dist(a, b){
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function throttle (callback, limit, id=0) {
  let waiting = {};
  return function () {
    if (!waiting[id]) {
      callback.apply(this, arguments);
      waiting[id] = true;
      setTimeout(function () {
        delete waiting[id]
      }, limit);
    }
  }

}

export default {
  //loom utils
  currentTargets,

  //generic utils
  objectFilter,
  arrayToObject,
  shallowCopy,
  shallowCopyPrimitivesOnly,
  deepCopy,
  deepMerge,
  absdiff,

  //poly utils
  scalePolygon,
  polyToPath2D,
  polyToPolyString,
  rectToPoly,
  boundingBox,
  bound,
  dist,

  //js utils
  sleep,
  throttle,
}