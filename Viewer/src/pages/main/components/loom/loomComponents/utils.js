function currentTargets(current_state, targets){
  return Object.values(targets).filter(target => 
    (findChild(target, current_state) != null ||
     findSibling(target, current_state, targets) != null ||
     target.parent == 'root') && target.hide != true
  );
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

export default {
  currentTargets,
  findByName,
  findChild,
  findSibling,
  deepCopy,
}