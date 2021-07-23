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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  currentTargets,
  findByName,
  findChild,
  findSibling,
  deepCopy,
  absdiff,
  sleep,
}