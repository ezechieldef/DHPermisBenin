"""Assemble the downloaded SVG elements for the human review of question images.
Run with Python 3; no network or database access. Source SVGs remain untouched.
"""
from pathlib import Path
from copy import deepcopy
import xml.etree.ElementTree as ET
import json, re, hashlib

BASE = Path(__file__).resolve().parent
OUT = BASE.parent
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
SOURCE_INFO = json.loads((BASE / 'SOURCES.json').read_text())
TAG = lambda name: '{' + NS + '}' + name

def load(name):
    root = ET.parse(BASE / SOURCE_INFO[name]['file']).getroot()
    # Keep vector drawing and definitions; discard editor-only metadata.
    for el in list(root):
        if el.tag.split('}')[-1] in ('metadata', 'namedview'):
            root.remove(el)
    if 'viewBox' not in root.attrib:
        w = re.match(r'[\d.]+', root.attrib['width'])[0]
        h = re.match(r'[\d.]+', root.attrib['height'])[0]
        root.set('viewBox', f'0 0 {w} {h}')
    return root

def remove_id(root, ident):
    for parent in root.iter():
        for el in list(parent):
            if el.get('id') == ident:
                parent.remove(el)

def label(root, value, x, y, size, weight='normal'):
    # Reuse the existing text element from the downloaded axle-load sign.
    template = next(el for el in load('Axle').iter() if el.tag == TAG('text'))
    el = deepcopy(template)
    el.attrib.clear()
    el.attrib.update({'x': str(x), 'y': str(y), 'text-anchor': 'middle',
                     'font-family': 'Arial, Helvetica, sans-serif',
                     'font-size': str(size), 'font-weight': weight, 'fill': '#000000'})
    el.text = value
    root.append(el)
    return el

def distance(value, extent=False, bold=False):
    root = load('M2' if extent else 'M1')
    remove_id(root, 'g70600' if extent else 'g65688')
    if extent:
        label(root, value, 320, 130, 96, 'bold')
    else:
        label(root, value, 201, 86, 77, 'bold' if bold else 'normal')
    return root

def vehicle_truck():
    # Reuse the plate frame and retain both truck wheels from B8.
    root = ET.Element(TAG('svg'), {'viewBox': '0 0 320 220'})
    rect = deepcopy(next(el for el in load('M4c').iter() if el.get('id') == 'rect2995'))
    rect.attrib.clear()
    rect.attrib.update({'x':'3','y':'3','width':'314','height':'214',
                       'rx':'10','ry':'10','fill':'#ffffff','stroke':'#000000','stroke-width':'3'})
    root.append(rect)
    truck = load('B8')
    for el in list(truck):
        if el.get('id') in ('circle6','circle8','circle10'):
            truck.remove(el)
    truck.set('viewBox', '142 215 280 152')
    place(root, truck, 20, 20, 280, 180, 'truck')
    return root

def slow_vehicles():
    root = load('B29')
    remove_id(root, 'g3019')
    label(root, 'VÉHICULES', 288, 266, 58, 'bold').set('fill', '#ffffff')
    label(root, 'LENTS', 288, 339, 62, 'bold').set('fill', '#ffffff')
    return root

def square_arrow():
    root = ET.Element(TAG('svg'), {'viewBox': '0 0 240 240'})
    # Reuse the rounded plate rectangle and the white B21a1 arrow.
    rect = deepcopy(next(el for el in load('M4c').iter() if el.get('id') == 'rect2995'))
    rect.attrib.clear()
    rect.attrib.update({'x': '3', 'y': '3', 'width': '234', 'height': '234',
                       'rx': '14', 'ry': '14', 'fill': '#0000ff', 'stroke': '#ffffff', 'stroke-width': '3'})
    root.append(rect)
    arrow = load('B21a1')
    for el in list(arrow):
        if el.tag == TAG('circle'):
            arrow.remove(el)
    place(root, arrow, 9, 9, 222, 222, 'arrow')
    return root

def disc_windows():
    # Match the square black plate and its two white windows visible in
    # q0167.webp; reuse the downloaded plate geometry for all three pieces.
    root = ET.Element(TAG('svg'), {'viewBox': '0 0 100 100'})
    template = next(el for el in load('M4c').iter() if el.get('id') == 'rect2995')
    for x, y, w, h, color in [(0, 0, 100, 100, '#000000'),
                             (13, 47, 22, 14, '#ffffff'),
                             (63, 44, 23, 16, '#ffffff')]:
        el = deepcopy(template)
        el.attrib.clear()
        el.attrib.update({'x':str(x),'y':str(y),'width':str(w),'height':str(h),'fill':color})
        root.append(el)
    return root

def height_limit():
    root = load('B12')
    remove_id(root, 'g3002')
    label(root, '3,5m', 288, 344, 132, 'bold')
    return root

def axle_limit():
    root = load('Axle')
    for parent in root.iter():
        for el in list(parent):
            if el.tag == TAG('text'):
                parent.remove(el)
    label(root, '2,5t', 288, 275, 145, 'bold')
    return root

def marker():
    root = load('J3')
    # The first twelve elements contain only the post; the following
    # elements are dimension lines, arrowheads and numeric annotations.
    for el in list(root)[12:]:
        root.remove(el)
    root.set('viewBox', '221 -4 137 837')
    # Use flat colors as in the WebP, keeping the source post geometry.
    for el in root:
        kind = el.tag.split('}')[-1]
        if kind in ('polyline', 'polygon', 'rect'):
            el.set('fill', '#ff0000' if el.get('fill') == 'url(#SVGID_3_)' else '#ffffff')
            el.set('stroke', '#000000')
            el.set('stroke-width', '2')
    return root

def place(parent, child, x, y, w, h, prefix):
    child = deepcopy(child)
    child.set('x',str(x));child.set('y',str(y));child.set('width',str(w));child.set('height',str(h))
    child.set('preserveAspectRatio','xMidYMid meet')
    # Namespacing prevents source gradients, clips and ids from colliding.
    ids = {el.get('id'): prefix+'-'+el.get('id') for el in child.iter() if el.get('id')}
    for el in child.iter():
        for key, value in list(el.attrib.items()):
            if key == 'id': el.set(key, ids[value])
            else:
                for old, new in ids.items():
                    value = value.replace('url(#'+old+')', 'url(#'+new+')')
                    if key.split('}')[-1] == 'href' and value == '#'+old: value = '#'+new
                el.set(key,value)
    parent.append(child)

RECIPES = {}

def write(name, height, elements, sources, changes, width=600):
    root = ET.Element(TAG('svg'), {'version':'1.1','viewBox':f'0 0 {width} {height}',
                                 'width':str(width),'height':str(height),'role':'img'})
    ET.SubElement(root,TAG('title')).text = name+' — composition pour vérification humaine'
    ET.SubElement(root,TAG('desc')).text = changes
    for i, (child,x,y,w,h) in enumerate(elements): place(root,child,x,y,w,h,f'{name}-{i}')
    data = ET.tostring(root,encoding='utf-8',xml_declaration=True)
    (OUT/(name+'.svg')).write_bytes(data)
    RECIPES[name] = {'sources': sources,'modifications':changes,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}

# Main signs and supplemental plates, matching the visible original labels.
write('q0023',704,[(load('A1d'),0,0,600,529),(distance('5Km',True),20,540,560,164)],['A1d','M2','Axle'],'Assemblage A1d + M2 ; inscription 5Km, flèches vers le haut.')
write('q0024',715,[(load('A3a'),0,0,600,529),(distance('200m'),0,540,600,175)],['A3a','M1','Axle'],'Assemblage A3a + panonceau 200m.')
write('q0053',757,[(height_limit(),0,0,600,600),(distance('10 Km', bold=True),135,615,330,96)],['B12','M1','Axle'],'Adaptation B12 à 3,5m et panonceau 10 Km.')
for name in ['q0059','q0122','q0671','q0672']:
    write(name,781,[(load('Speed60'),0,0,600,600),(load('M4c'),115,620,370,151)],['Speed60','M4c'],'Assemblage limitation 60 + panonceau de motocyclette.')
write('q0060',655,[(slow_vehicles(),90,0,420,420),(square_arrow(),190,435,220,220)],['B29','B21a1','M4c','Axle'],'Inscription VÉHICULES LENTS sur le disque bleu ; flèche blanche vers le bas à droite sur plaque carrée bleue.')
write('q0063',780,[(load('B14_50'),0,0,600,600),(vehicle_truck(),190,620,220,160)],['B14_50','B8','M4c'],'Assemblage limitation 50 + panonceau de camion.')
write('q0127',688,[(load('A18'),0,0,600,529),(distance('150m'),45,540,510,148)],['A18','M1','Axle'],'Assemblage double sens + panonceau 150m.')
write('q0129',837,[(marker(),0,0,137,837)],['J3'],'Balise J3 isolée des cotes techniques ; couleurs plates et contours comme dans le WebP.',137)
write('q0145',1210,[(load('B14_50'),0,0,600,600),(load('B25'),0,610,600,600)],['B14_50','B25'],'Assemblage vertical limitation maximale 50 et vitesse minimale 30.')
write('q0160',697,[(load('A1d'),0,0,600,529),(distance('500m'),30,540,540,157)],['A1d','M1','Axle'],'Assemblage A1d + panonceau 500m.')
write('q0167',1050,[(load('B6a1'),0,0,600,600),(disc_windows(),225,900,150,150)],['B6a1','M4c'],'Assemblage stationnement interdit + plaque noire à deux fenêtres blanches, reproduisant le panonceau visible dans le WebP par réemploi de rectangles du SVG source.')
write('q0179',1075,[(load('B22a'),100,0,400,400),(load('B2b'),125,640,350,350),(distance('6t'),215,1000,170,75)],['B22a','B2b','M1','Axle'],'Deux groupes verticaux : piste cyclable obligatoire ; tourner à droite interdit + panonceau 6t, sans pictogramme de camion absent du WebP.')
write('q0183',771,[(load('B14_50'),0,0,600,600),(distance('500m',True),25,610,550,161)],['B14_50','M2','Axle'],'Assemblage limitation 50 + M2 500m, avec flèches vers le haut.')
write('q0190',1210,[(load('B14_50'),0,0,600,600),(load('B8'),0,610,600,600)],['B14_50','B8'],'Assemblage limitation 50 + accès interdit aux véhicules de transport de marchandises.')
write('q0722',872,[(load('B2a'),0,0,600,600),(vehicle_truck(),175,700,250,172)],['B2a','B8','M4c'],'Assemblage tourner à gauche interdit + panonceau de camion.')
write('q0724',730,[(load('B8'),0,0,600,600),(distance('5.5t', bold=True),140,625,320,93)],['B8','M1','Axle'],'Assemblage accès interdit aux véhicules de transport de marchandises + panonceau 5.5t.')
write('q0725',600,[(axle_limit(),0,0,600,600)],['Axle'],'Inscription du SVG de limite par essieu adaptée de 5t à 2,5t ; pictogramme existant conservé, sans triangle supplémentaire.')

(OUT/'COMPOSITIONS.json').write_text(json.dumps(RECIPES,ensure_ascii=False,indent=2)+'\n')
print(f'{len(RECIPES)} SVG assemblés ou adaptés ; sources originales conservées.')
