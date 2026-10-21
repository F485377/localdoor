# xlsx の1枚目を読む（外部ライブラリなし）
import sys, zipfile, re, json
import xml.etree.ElementTree as ET
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def read(path, sheet=1):
    z = zipfile.ZipFile(path)
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
            # ふりがな（rPh）は除き、本文の t だけをつなぐ
            parts = [t.text or '' for t in si.findall('m:t', NS)] + [t.text or '' for r in si.findall('m:r', NS) for t in r.findall('m:t', NS)]
            shared.append(''.join(parts))
    rows = []
    root = ET.fromstring(z.read(f'xl/worksheets/sheet{sheet}.xml'))
    for r in root.iter('{%s}row' % NS['m']):
        row = {}
        for c in r.findall('m:c', NS):
            col = re.match(r'[A-Z]+', c.get('r')).group()
            v = c.find('m:v', NS)
            if v is None:
                isv = c.find('m:is', NS)
                val = ''.join(t.text or '' for t in isv.iter('{%s}t' % NS['m'])) if isv is not None else ''
            else:
                val = shared[int(v.text)] if c.get('t') == 's' else v.text
            row[col] = val
        rows.append(row)
    return rows
if __name__ == '__main__':
    rows = read(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 1)
    print(json.dumps(rows[:6], ensure_ascii=False)); print(len(rows))
