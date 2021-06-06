import json
import argparse

#TODO: make conversion.find support finding arrays

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
            if not self.isIn(key, haystack):
                return None
            else:
                if self.isPrimitive(val):
                    return haystack if self.get(key, haystack) == val else None
                else:
                    return haystack if self._find(val, haystack[key]) is not None else None

    def _traverse(self, haystack):
        rets = []
        if isinstance(haystack, list):
            for val in haystack:
                if self.isPrimitive(val):
                    continue # leaf node
                found = self._find(self.needle, val)
                if found is not None:
                    rets.append(found)
                    if not self.recurse:
                        continue
                rets.extend(self._traverse(val))
        elif isinstance(haystack, dict):
            for key, val in haystack.items():
                if self.isPrimitive(val):
                    continue #leaf node
                found = self._find(self.needle, val)
                if found is not None:
                    rets.append(found)
                    if not self.recurse:
                        continue
                rets.extend(self._traverse(val))
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
        #config = self.toDicts(config)
        for conversion in self.conversions:
            objs = conversion.find(config)
            for i in range(len(objs)):
                conversion.convert(objs[i])
        return config


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

def brushToPoly(obj):
    rectToPoly(obj)

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


def circToPoly(obj):
    obj['shape'] = 20

def main(ifile, ofile):

    with open(ifile, 'r') as fin, open(ofile, 'w') as fout:
        
        iconfig = json.load(fin)

        configConverter = ConfigConverter([
            Conversion(find = {"actor": "brush"}, convert = brushToPoly),
            Conversion(find = {"shape": {"type": "rect"}}, convert = rectToPoly),
            Conversion(find = {"shape": {"type": "circ"}}, convert = circToPoly),
            Conversion(find = {"shape": {"type": "poly"}}, convert = polyAddDim)
        ])

        newConfig = configConverter.convert(iconfig)
        json.dump(newConfig, fout)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('ifile', nargs='?', default='config.json')
    parser.add_argument('ofile', nargs='?', default='new_config.json')

    args = parser.parse_args()
    main(**vars(args))


