function Node(data, rank = 0, parent = -1) {
  this.rank = rank;
  this.parent = parent;
  this.data = data;
  this.children = [];
}

function DSet() {
  this.sets = {};
  this.nsets = 0;
}

DSet.prototype = {
  add(id = undefined, data = undefined) {
    if (id == undefined) id = this.sets.length;
    this.sets[id] = new Node(data);
    this.sets[id].children.push(id);
    ++this.nsets;
    return id;
  },
  find(i) {
    if (!this.sets[i])  return null;
    if (this.sets[i].parent == -1) return i;
    this.sets[i].parent = this.find(this.sets[i].parent)
    return this.sets[i].parent;
  },
  transferChildren(ifrom, ito) {
    const nfrom = this.sets[ifrom];
    const nto = this.sets[ito];
    nto.children = nto.children.concat(nfrom.children);
    nfrom.children = [];
  },
  merge(i, j) {
    i = this.find(i);
    j = this.find(j);
    if(i == null || j == null)  return null;
    if (i != j) {
      const ni = this.sets[i];
      const nj = this.sets[j];
      if (ni.rank > nj.rank) { nj.parent = i; this.transferChildren(j, i); }
      else if (ni.rank < nj.rank) { ni.parent = j; this.transferChildren(i, j); }
      else { nj.parent = i; ++ni.rank; this.transferChildren(j, i); }
      --this.nsets;
    }
    return this.find(i);
  },
  of(i) {
    return this.sets[this.find(i)].children.map(c => this.sets[c].data);
  },
  connected(i, j) {
    return this.find(i) === this.find(j);
  },
  at(i) {
    return this.sets[i].data;
  },
  exists(i) {
    return this.sets.hasOwnProperty(i);
  },
  size() {
    return this.nsets;
  },
}

/* if(require.main === module) {

  const dset = new DSet;

  const p1 = {'name': 'joe'};
  const p2 = {'name': 'jan'};
  const p3 = {'name': 'dan'};
  const p4 = {'name': 'ben'};
  const p5 = {'name': 'tim'};
  const p6 = {'name': 'tom'};

  dset.add(p1.name, p1);
  dset.add(p2.name, p2);
  dset.add(p3.name, p3);
  dset.add(p4.name, p4);
  dset.add(p5.name, p5);
  dset.add(p6.name, p6);

  dset.merge(p1.name, p2.name);
  dset.merge(p3.name, p4.name);
  dset.merge(p5.name, p6.name);

  dset.merge(p1.name, p4.name);

  dset.of(p1.name).forEach(p => console.log(p.name));
} */

export default DSet;
