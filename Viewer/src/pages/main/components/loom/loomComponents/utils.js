function currentTargets(current_state, targets){
  if(!current_state) return {};
  const keys = Object.keys(targets).filter(tkey => 
    (findChild(targets[tkey], current_state) != null ||
     findSibling(targets[tkey], current_state, targets) != null ||
     targets[tkey].parent == 'root') && targets[tkey].hide != true
  );
  const ret = {};
  keys.forEach(k => ret[k] = targets[k]);
  return ret;
}

function findByName(name, targets){
  return Object.values(targets).find(t => t.name == name) || null;
}

function findChild(needle, haystack){
  if (!(haystack && haystack.hasOwnProperty("children"))) return null;
  return Object.values(haystack.children).find(c => c.frame_no == needle.frame_no) || null;
}

function findSibling(target1, target2, targets){
  return findChild(target1, findByName(target2.parent, targets));
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
  currentTargets,
  findByName,
  findChild,
  findSibling,
  deepCopy,
  absdiff,
  polyToPath2D,
  polyToPolyString,
  rectToPoly,
  bound,
  dist,
  sleep,
  throttle,
}