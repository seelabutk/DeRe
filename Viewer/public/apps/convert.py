import json
import argparse

from functools import reduce
import copy

#TODO: convert to javascript?

class Conversion:
    def __init__(self, find, convert, recurse=True):
        self.convert = convert
        self.recurse = recurse
        self.needle = find
        self.primitives = (int, float, complex, str, bool)

    def isPrimitive(self, var):
        return isinstance(var, self.primitives)

    def isIn(self, key, obj):
        if isinstance(obj, list):
            return True if key.isnumeric() and int(key) < len(obj) else False
        elif isinstance(obj, dict):
            return key in obj
        else:
            raise Exception("bad type?")
    
    def get(self, key, obj):
        if isinstance(obj, list):
            return obj[int(key)] if key.isnumeric() and int(key) < len(obj) else None
        elif isinstance(obj, dict):
            return obj[key]
        else:
            raise Exception("bad type?")

    def _find(self, needle, haystack):
        for key, val in needle.items():
            
            if key != '*' and not self.isIn(key, haystack):
                return None
            else:
                if val == '*':
                    return haystack
                elif self.isPrimitive(val):
                    return haystack if self.get(key, haystack) == val else None
                else:
                    return haystack if self._find(val, haystack[key]) is not None else None

    def _traverse(self, haystack, parent=None):
        rets = []
        if isinstance(haystack, list):
            for val in haystack:
                if self.isPrimitive(val):
                    continue # leaf node
                if not isinstance(val, list) and '__parent__' not in val:
                    val['__parent__'] = parent
                    
                found = self._find(self.needle, val)
                if found is not None:
                    rets.append(found)
                    if not self.recurse:
                        continue
                rets.extend(self._traverse(val))
        elif isinstance(haystack, dict):
            for key, val in haystack.items():
                if self.isPrimitive(val) or key == "__parent__":
                    continue #leaf node
                if not isinstance(haystack[key], list) and '__parent__' not in haystack[key]:
                    haystack[key]['__parent__'] = haystack
                
                found = self._find(self.needle, val)
                if found is not None:
                    rets.append(found)
                    if not self.recurse:
                        continue
                rets.extend(self._traverse(val, haystack))
        elif self.isPrimitive(haystack):
            pass #leaf node
        else:
            raise Exception("bad type?") 
        return list(filter(lambda x: x != None, rets))

    def find(self, haystack):
        rets = []
        found = self._find(self.needle, haystack)
        if found:
            rets.append(found)
            if not self.recurse:
                return rets
        rets.extend(self._traverse(haystack))
        return rets
        

class ConfigConverter:
    def __init__(self, conversions = []):
        self.conversions = conversions

    def addConversion(self, conversion):
        self.conversions.append(conversion)
        return self

    def toDicts(self, obj):
        for item in obj.items():
            if type(item[1]) is list:
                obj[item[0]] = {i: self.toDicts(item[1][i]) for i in range(len(item[1]))}
            elif type(item[1]) is dict:
                self.toDicts(item[1])
        return obj

    def convert(self, config):
        self.addConversion(Conversion(find = {"__parent__": "*"}, convert = self.delParent))
        for conversion in self.conversions:
            objs = conversion.find(config)
            for i in range(len(objs)):
                conversion.convert(objs[i])
        return config
    
    def delParent(self, obj):
        if '__parent__' in obj:
            del obj['__parent__']




#Version 0.0.1 (nytimes)
def rectToShape(obj):
    rect = obj['rect']
    del obj['rect']
    obj['shape'] = rect
    obj['shape']['type'] = 'rect'

def add_parents(obj):
    if '__parent__' in obj:
        obj['parent'] = obj['__parent__']['name']

#Version 0.0.2 (tableau)
def rectToPoly(obj):
    rect = obj['shape']
    points = [
        {'x': rect['x'], 'y': rect['y']},
        {'x': rect['x'] + rect['width'], 'y': rect['y']},
        {'x': rect['x'] + rect['width'], 'y': rect['y'] + rect['height']},
        {'x': rect['x'], 'y': rect['y'] + rect['height']}
    ]
    obj['shape'] = {
        "type": "poly",
        "points": points,
        "centerX": (2*rect['x'] + rect['width'])/2,
        "centerY": (2*rect['y'] + rect['height'])/2
    }

def polyAddDim(obj):
    minx = miny =  10000000
    maxx = maxy = -10000000
    for v in obj['shape']['points']:
        x = v['x']
        y = v['y']
        minx = min(minx, x)
        maxx = max(maxx, x)
        miny = min(miny, y)
        maxy = max(maxy, y)
    obj['shape']['dimensions'] = {
        "min_x": minx,
        "max_x": maxx,
        "min_y": miny,
        "max_y": maxy,
        "centerX": (maxx + minx)/2,
        "centerY": (maxy + miny)/2,
    }
    del obj['shape']['centerX']
    del obj['shape']['centerY']

#Version 0.0.5 - name standardization
def brushToBrushingBox(obj):
    obj['actor'] = 'brushingBox'

def versionConvert(version):
    def convert(obj):
        obj['version'] = version
    return convert


def arrayToObjectRecurse(val, key=None, parent=None):
    if isinstance(val, (int, float, complex, str, bool)):
        return
    elif isinstance(val, list): #bad, change to dict
        nval = {}
        for i in range(len(val)):
            arrayToObjectRecurse(val[i], i, val)
            nval[str(i)] = val[i]
        parent[key] = nval
    elif isinstance(val, object): #good, do nothing but recurse
        for nkey in val:
            arrayToObjectRecurse(val[nkey], nkey, val)


def deeper(obj, key):
    if key not in obj:
        obj[key] = {}
    return obj[key]

def objDiff(obj1, obj2, keys=[], cache={}):
    if isinstance(obj1, (int, float, complex, str, bool)): #if second object is different from first
        if obj1 != obj2:
            c = reduce(lambda c, k: deeper(c, k), keys[:-1], cache)
            c[keys[-1]] = obj2
        return
    elif isinstance(obj2, (int, float, complex, str, bool)): #if first object is deeper than second
        if obj2 != obj1:
            c = reduce(lambda c, k: deeper(c, k), keys[:-1], cache)
            c[keys[-1]] = obj2
        return

    for k in obj2:
        if k not in obj1:
            c = reduce(lambda c, k: deeper(c, k), keys, cache)
            c[k] = obj2[k]
        else:
            objDiff(obj1[k], obj2[k], [*keys, k], cache)
    return cache
            


#todo
def circToPoly(obj):
    obj['shape'] = 20


def flatRecurse(obj, flat={}):
    for val in obj.values():
        flat[val['id']] = val
        if 'children' in val:
            flatRecurse(val['children'], flat)
            flat[val['id']]['children'] = {v['id']: {} for v in val['children'].values()}
    return flat


def flattenConfig(obj):
    flat = {}
    for key in obj:
        if key == 'version':
            flat[key] = obj[key]
            continue
        flat[key] = {}
        flat['info'] = obj[key]
        flat[key]['info'] = {'mode': obj[key]['mode']}
        flat[key]['data'] = {}
        flat[key]['data'] = flatRecurse(obj[key]['children'])
        flat[key]['data']['-1'] = {'children': {v['id']: {} for v in obj[key]['children'].values()}, 'id': '-1' }
        del flat['info']['id']
        del flat['info']['children']
        del flat['info']['visited']
        del flat['info']['child_visit_counter']
        del flat['info']['frame_no']
        del flat['info']['name']
        del flat['info']['mode']
    return flat

def parentifyRecurse(obj, key, parentkey):
    pid = obj[parentkey]['id']
    obj[key]['parent_id'] = pid
    if 'parent' in obj[key]:
        del obj[key]['parent']
    if 'children' in obj[key]:
        for childKey in obj[key]['children']:
            parentifyRecurse(obj, childKey, key)

def parentify(obj):
    del obj['version']
    for key in obj:
        if key == 'info':
            continue
        parentifyRecurse(obj[key]['data'], '-1', '-1')
    return obj

#Version 0.0.7 (current)

def main(ifile, ofile):
    with open(ifile, 'r') as fin:
        iconfig = json.load(fin)

        #syncing up tableau and nytimes versions
        if iconfig['version'] == '0.0.1':
            configConverter = ConfigConverter([
                Conversion(find = {"rect": "*"}, convert = rectToShape),
                Conversion(find = {"id": "*"}, convert = add_parents)
            ])
            iconfig = configConverter.convert(iconfig)
            iconfig['version'] = '0.0.2'

        #changing everything to polygons
        if iconfig['version'] == '0.0.2':
            configConverter = ConfigConverter([
                Conversion(find = {"actor": "brush"}, convert = rectToPoly),
                Conversion(find = {"shape": {"type": "rect"}}, convert = rectToPoly),
                Conversion(find = {"shape": {"type": "circ"}}, convert = circToPoly),
                Conversion(find = {"shape": {"type": "poly"}}, convert = polyAddDim)
            ])
            iconfig = configConverter.convert(iconfig)
            iconfig['version'] = '0.0.3'
        
        #adding multiple modes
        if iconfig['version'] == '0.0.3':
            iconfig['mode'] = 'desktop'
            iconfig['version'] = '0.0.4'
            iconfig = {'desktop': iconfig}
            iconfig['version'] = '0.0.4'
        
        #rename brush to brushingBox
        if iconfig['version'] == '0.0.4':
            configConverter = ConfigConverter([
                Conversion(find={"actor": "brush"}, convert = brushToBrushingBox),
                Conversion(find={'version': '0.0.4'}, convert = versionConvert('0.0.5'))
            ])
            iconfig = configConverter.convert(iconfig)
        
        #create global "original" target set in which other modes overwrite only differences
        #convert all arrays to objects where keys are indices
        if iconfig['version'] == '0.0.5':
            iconfig['original'] = iconfig['desktop']
            
            dels = []
            for mode in iconfig:
                if mode == 'original' or mode == 'version':
                    continue
                arrayToObjectRecurse(iconfig[mode])
                iconfig[mode] = objDiff(iconfig['original'], iconfig[mode])
                if not iconfig[mode]:
                    dels.append(mode)
            
            for d in dels:
                del iconfig[d]

            configConverter = ConfigConverter([Conversion(find={'version': '0.0.5'}, convert = versionConvert('0.0.6'))])
            iconfig = configConverter.convert(iconfig)

        if iconfig['version'] == '0.0.6':
            configConverter = ConfigConverter([Conversion(find={'version': '0.0.6'}, convert = versionConvert('0.0.7'))])
            iconfig = configConverter.convert(iconfig)
            
            iconfig = flattenConfig(iconfig)
            iconfig = parentify(iconfig)
        
        if iconfig['info']['version'] == '0.0.7':
            print("current version")

    with open(ofile, 'w') as fout:
        json.dump(iconfig, fout)

if __name__ == "__main__":
    default_ifile = 'config.json'
    default_ofile = 'new_config.json'

    #temp overwrite
    default_ifile = 'tableau/config.json'
    default_ofile = 'tableau/new_config.json'

    parser = argparse.ArgumentParser()
    parser.add_argument('ifile', nargs='?', default=default_ifile)
    parser.add_argument('ofile', nargs='?', default=default_ofile)

    args = parser.parse_args()
    main(**vars(args))


