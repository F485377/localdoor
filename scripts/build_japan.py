# 全国の都道府県・市区町村のデータと、タップできる日本地図（SVG）を作る。作り直すときだけ使う。
#   python3 scripts/build_japan.py <入力のフォルダ> <このリポジトリ>
#   入力のフォルダに置くもの：
#     code.xlsx      総務省「全国地方公共団体コード」 https://www.soumu.go.jp/denshijiti/code.html
#     ja.json        Geolonia の市区町村一覧 https://geolonia.github.io/japanese-addresses/api/ja.json
#     japan.geojson  都道府県の形 https://github.com/dataofjapan/land
#   市区町村の中心は、Geolonia の町ごとの位置（api/ja/<都道府県>/<市区町村>.json）の中央値（towns-cache.json に保存して使い回す）
#   出力：lib/data/prefs.json（地方・都道府県。画面とサーバー）、lib/data/cities.json（サーバー）、
#        public/data/cities.json・public/data/japan-map.json（画面が必要なときに読む）
import json, math, os, sys, unicodedata, urllib.parse, urllib.request, statistics
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
from xlsx import read  # scripts/xlsx.py

DL = sys.argv[1]
OUT = sys.argv[2]

# ───── カナ → ローマ字（ヘボン式。長音は付けない）・ハングル ─────
ROMA = {
 'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o','カ':'ka','キ':'ki','ク':'ku','ケ':'ke','コ':'ko','サ':'sa','シ':'shi','ス':'su','セ':'se','ソ':'so',
 'タ':'ta','チ':'chi','ツ':'tsu','テ':'te','ト':'to','ナ':'na','ニ':'ni','ヌ':'nu','ネ':'ne','ノ':'no','ハ':'ha','ヒ':'hi','フ':'fu','ヘ':'he','ホ':'ho',
 'マ':'ma','ミ':'mi','ム':'mu','メ':'me','モ':'mo','ヤ':'ya','ユ':'yu','ヨ':'yo','ラ':'ra','リ':'ri','ル':'ru','レ':'re','ロ':'ro','ワ':'wa','ヲ':'o','ン':'n',
 'ガ':'ga','ギ':'gi','グ':'gu','ゲ':'ge','ゴ':'go','ザ':'za','ジ':'ji','ズ':'zu','ゼ':'ze','ゾ':'zo','ダ':'da','ヂ':'ji','ヅ':'zu','デ':'de','ド':'do',
 'バ':'ba','ビ':'bi','ブ':'bu','ベ':'be','ボ':'bo','パ':'pa','ピ':'pi','プ':'pu','ペ':'pe','ポ':'po','ヴ':'vu',
}
YOON = {'ャ':'a','ュ':'u','ョ':'o'}
YOON_HEAD = {'キ':'ky','ギ':'gy','シ':'sh','ジ':'j','チ':'ch','ニ':'ny','ヒ':'hy','ビ':'by','ピ':'py','ミ':'my','リ':'ry'}

def to_kata(s):
    return unicodedata.normalize('NFKC', s or '')

def romaji(kana):
    k = to_kata(kana)
    out = ''
    i = 0
    double = False
    while i < len(k):
        c = k[i]
        nxt = k[i + 1] if i + 1 < len(k) else ''
        if c == 'ッ':
            double = True; i += 1; continue
        if c == 'ー':
            i += 1; continue
        if nxt in YOON and c in YOON_HEAD:
            syl = YOON_HEAD[c] + YOON[nxt]; i += 2
        else:
            syl = ROMA.get(c, ''); i += 1
        if double and syl:
            syl = ('t' + syl) if syl.startswith('ch') else syl[0] + syl
            double = False
        out += syl
    # 長音を落とす（ou → o、uu → u、語頭の oo → o）
    out = out.replace('ou', 'o').replace('uu', 'u')
    if out.startswith('oo'):
        out = out[1:]
    return out[:1].upper() + out[1:]

# ハングル（国立国語院の日本語表記：語頭の清音は平音、語中は激音。長音は書かない。ッ→ㅅ、ン→ㄴ）
CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
def syl(c, v):
    return chr(0xAC00 + (CHO.index(c) * 21 + JUNG.index(v)) * 28)
def add_jong(s, j):
    if not s: return s
    code = ord(s[-1]) - 0xAC00
    if code < 0 or code % 28: return s
    return s[:-1] + chr(ord(s[-1]) + JONG.index(j))
V = {'a': 'ㅏ', 'i': 'ㅣ', 'u': 'ㅜ', 'e': 'ㅔ', 'o': 'ㅗ'}
VY = {'a': 'ㅑ', 'u': 'ㅠ', 'o': 'ㅛ'}
# 子音（語頭, 語中）
KONS = {
 'カ':('ㄱ','ㅋ'),'キ':('ㄱ','ㅋ'),'ク':('ㄱ','ㅋ'),'ケ':('ㄱ','ㅋ'),'コ':('ㄱ','ㅋ'),'タ':('ㄷ','ㅌ'),'テ':('ㄷ','ㅌ'),'ト':('ㄷ','ㅌ'),
 'チ':('ㅈ','ㅊ'),'ツ':('ㅆ','ㅆ'),'サ':('ㅅ','ㅅ'),'シ':('ㅅ','ㅅ'),'ス':('ㅅ','ㅅ'),'セ':('ㅅ','ㅅ'),'ソ':('ㅅ','ㅅ'),
 'ナ':('ㄴ','ㄴ'),'ニ':('ㄴ','ㄴ'),'ヌ':('ㄴ','ㄴ'),'ネ':('ㄴ','ㄴ'),'ノ':('ㄴ','ㄴ'),'ハ':('ㅎ','ㅎ'),'ヒ':('ㅎ','ㅎ'),'フ':('ㅎ','ㅎ'),'ヘ':('ㅎ','ㅎ'),'ホ':('ㅎ','ㅎ'),
 'マ':('ㅁ','ㅁ'),'ミ':('ㅁ','ㅁ'),'ム':('ㅁ','ㅁ'),'メ':('ㅁ','ㅁ'),'モ':('ㅁ','ㅁ'),'ラ':('ㄹ','ㄹ'),'リ':('ㄹ','ㄹ'),'ル':('ㄹ','ㄹ'),'レ':('ㄹ','ㄹ'),'ロ':('ㄹ','ㄹ'),
 'ガ':('ㄱ','ㄱ'),'ギ':('ㄱ','ㄱ'),'グ':('ㄱ','ㄱ'),'ゲ':('ㄱ','ㄱ'),'ゴ':('ㄱ','ㄱ'),'ザ':('ㅈ','ㅈ'),'ジ':('ㅈ','ㅈ'),'ズ':('ㅈ','ㅈ'),'ゼ':('ㅈ','ㅈ'),'ゾ':('ㅈ','ㅈ'),
 'ダ':('ㄷ','ㄷ'),'ヂ':('ㅈ','ㅈ'),'ヅ':('ㅈ','ㅈ'),'デ':('ㄷ','ㄷ'),'ド':('ㄷ','ㄷ'),'バ':('ㅂ','ㅂ'),'ビ':('ㅂ','ㅂ'),'ブ':('ㅂ','ㅂ'),'ベ':('ㅂ','ㅂ'),'ボ':('ㅂ','ㅂ'),
 'パ':('ㅍ','ㅍ'),'ピ':('ㅍ','ㅍ'),'プ':('ㅍ','ㅍ'),'ペ':('ㅍ','ㅍ'),'ポ':('ㅍ','ㅍ'),
}
VOWEL_OF = {}
for k, r in ROMA.items():
    if r: VOWEL_OF[k] = r[-1]
def hangul(kana):
    k = to_kata(kana)
    out = ''
    i = 0
    prev_v = ''
    while i < len(k):
        c = k[i]
        nxt = k[i + 1] if i + 1 < len(k) else ''
        first = out == ''
        if c == 'ッ': out = add_jong(out, 'ㅅ'); i += 1; continue
        if c == 'ン': out = add_jong(out, 'ㄴ'); i += 1; prev_v = ''; continue
        if c == 'ー': i += 1; continue
        # 長音（オウ・ウウ・オオ）は書かない
        if c == 'ウ' and prev_v in ('o', 'u') and not first: i += 1; continue
        if c == 'オ' and prev_v == 'o' and not first: i += 1; continue
        if nxt in YOON and c in YOON_HEAD:
            v = YOON[nxt]
            if c in ('シ', 'ジ', 'チ'):
                cons = {'シ': ('ㅅ', 'ㅅ'), 'ジ': ('ㅈ', 'ㅈ'), 'チ': ('ㅈ', 'ㅊ')}[c]
                out += syl(cons[0] if first else cons[1], V[v])
            else:
                cons = KONS.get(c, ('ㅇ', 'ㅇ'))
                out += syl(cons[0] if first else cons[1], VY[v])
            prev_v = v; i += 2; continue
        if c in ('ヤ', 'ユ', 'ヨ'):
            out += syl('ㅇ', VY[ROMA[c][-1]]); prev_v = ROMA[c][-1]; i += 1; continue
        if c == 'ワ': out += syl('ㅇ', 'ㅘ'); prev_v = 'a'; i += 1; continue
        if c == 'ヲ': out += syl('ㅇ', 'ㅗ'); prev_v = 'o'; i += 1; continue
        v = VOWEL_OF.get(c)
        if not v: i += 1; continue
        cons = KONS.get(c, ('ㅇ', 'ㅇ'))
        jung = 'ㅡ' if c in ('ス', 'ズ', 'ツ', 'ヅ') else V[v]
        out += syl(cons[0] if first else cons[1], jung)
        prev_v = v; i += 1
    return out

# ───── 総務省の表 ─────
rows = read(os.path.join(DL, 'code.xlsx'), 1)[1:]
PREF_SUFFIX = {'都': ('ト', '도', ''), '道': ('', '', ''), '府': ('フ', '부', ''), '県': ('ケン', '현', '')}
prefs, cities = {}, []
for r in rows:
    code = r.get('A', '')
    if not code: continue
    pcode = code[:2]
    if not r.get('C'):
        name = r['B']
        kana = to_kata(r['D'])
        if name == '北海道':
            en, ko = 'Hokkaido', '홋카이도'
        else:
            suf = name[-1]
            strip = PREF_SUFFIX[suf][0]
            base = kana[: -len(strip)] if strip and kana.endswith(strip) else kana
            en, ko = romaji(base), hangul(base) + PREF_SUFFIX[suf][1]
        prefs[pcode] = {'code': pcode, 'ja': name, 'en': en, 'zh': name, 'zt': name, 'ko': ko}
        continue
    name, kana = r['C'], to_kata(r['E'])
    last = name[-1]
    rules = {'市': (['シ'], '', '시'), '区': (['ク'], '', '구'), '町': (['マチ', 'チョウ'], ' Town', '정'), '村': (['ムラ', 'ソン'], ' Village', '촌')}
    strips, en_suf, ko_suf = rules.get(last, ([], '', ''))
    base = kana
    for s in strips:
        if kana.endswith(s):
            base = kana[: -len(s)]; break
    cities.append({'id': code[:5], 'pref': pcode, 'ja': name, 'en': romaji(base) + en_suf, 'ko': hangul(base) + ko_suf})
print('prefs', len(prefs), 'cities', len(cities))

# ───── 市区町村の中心（Geolonia の町の位置の中央値）。政令市は区をまとめる ─────
geo = json.load(open(os.path.join(DL, 'ja.json')))
cache_path = os.path.join(DL, 'towns-cache.json')
cache = json.load(open(cache_path)) if os.path.exists(cache_path) else {}
def fetch(pref, city):
    key = f'{pref}/{city}'
    if key in cache: return key, cache[key]
    url = 'https://geolonia.github.io/japanese-addresses/api/ja/' + urllib.parse.quote(pref) + '/' + urllib.parse.quote(city) + '.json'
    try:
        with urllib.request.urlopen(url, timeout=30) as res:
            towns = json.load(res)
        pts = [(t['lat'], t['lng']) for t in towns if t.get('lat') and t.get('lng')]
        val = [statistics.median(p[0] for p in pts), statistics.median(p[1] for p in pts)] if pts else None
    except Exception as e:
        val = None
    return key, val
jobs = [(p, c) for p, cs in geo.items() for c in cs]
with ThreadPoolExecutor(12) as ex:
    for key, val in ex.map(lambda a: fetch(*a), jobs):
        cache[key] = val
json.dump(cache, open(cache_path, 'w'), ensure_ascii=False)
pref_name = {p['code']: p['ja'] for p in prefs.values()}
missing = 0
by_pref = {}
for k, v in cache.items():
    if v:
        pn, cn = k.split('/', 1)
        by_pref.setdefault(pn, []).append((cn, v))
for c in cities:
    pn, name = pref_name[c['pref']], c['ja'].replace('ヶ', 'ケ')
    pts = []
    for cn, v in by_pref.get(pn, []):
        cn = cn.replace('ヶ', 'ケ')
        if cn == name or (cn.endswith(name) and cn[: -len(name)].endswith('郡')):
            pts.append(v)
        elif name.endswith('市') and cn.startswith(name) and cn.endswith('区'):  # 政令市：区をまとめる
            pts.append(v)
    if pts:
        c['lat'] = round(statistics.median(p[0] for p in pts), 4)
        c['lng'] = round(statistics.median(p[1] for p in pts), 4)
    else:
        missing += 1
        print('  no position:', pn, name)
print('cities without position', missing)

# ───── 地図（都道府県の形を簡単にして SVG のパスに） ─────
REGIONS = [
 ('hokkaido', '北海道', 'Hokkaido', '北海道', '北海道', '홋카이도', ['01']),
 ('tohoku', '東北', 'Tohoku', '东北', '東北', '도호쿠', ['02','03','04','05','06','07']),
 ('kanto', '関東', 'Kanto', '关东', '關東', '간토', ['08','09','10','11','12','13','14']),
 ('chubu', '中部', 'Chubu', '中部', '中部', '주부', ['15','16','17','18','19','20','21','22','23']),
 ('kinki', '近畿', 'Kansai', '关西', '關西', '간사이', ['24','25','26','27','28','29','30']),
 ('chugoku', '中国', 'Chugoku', '中国地区', '中國地區', '주고쿠', ['31','32','33','34','35']),
 ('shikoku', '四国', 'Shikoku', '四国', '四國', '시코쿠', ['36','37','38','39']),
 ('kyushu', '九州・沖縄', 'Kyushu & Okinawa', '九州・冲绳', '九州・沖繩', '규슈・오키나와', ['40','41','42','43','44','45','46','47']),
]
region_of = {p: r[0] for r in REGIONS for p in r[6]}
for code, p in prefs.items():
    p['region'] = region_of[code]

gj = json.load(open(os.path.join(DL, 'japan.geojson')))
LAT0 = 36.0
def proj(lng, lat, okinawa=False):
    if okinawa:  # 沖縄は左下に寄せる（はめ込み）
        lng, lat = lng + 5.5, lat + 4.6
    return ((lng - 128.0) * math.cos(math.radians(LAT0)) * 60, (46.0 - lat) * 60)
def area(ring):
    return abs(sum(ring[i][0] * ring[i - 1][1] - ring[i - 1][0] * ring[i][1] for i in range(len(ring)))) / 2
def simplify_ring(ring, eps):
    # 閉じた輪は、始点からいちばん遠い点で2つに分けてから簡単にする
    pts = ring[:-1] if ring[0] == ring[-1] else ring
    if len(pts) < 4: return pts
    far = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
    return dp(pts[: far + 1], eps)[:-1] + dp(pts[far:] + [pts[0]], eps)[:-1]

def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy) or 1e-9
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / n
        if d > dmax: dmax, idx = d, i
    if dmax > eps:
        return dp(pts[: idx + 1], eps)[:-1] + dp(pts[idx:], eps)
    return [a, b]
shapes = {}
for f in gj['features']:
    code = f'{int(f["properties"]["id"]):02d}'
    polys = f['geometry']['coordinates'] if f['geometry']['type'] == 'MultiPolygon' else [f['geometry']['coordinates']]
    raw = [[proj(x, y, code == '47') for x, y in poly[0]] for poly in polys]
    main = max(raw, key=area)
    mx = (min(p[0] for p in main) + max(p[0] for p in main)) / 2
    my = (min(p[1] for p in main) + max(p[1] for p in main)) / 2
    reach = 160 if code in ('46', '47') else 70  # 遠い島（小笠原など）は省く
    rings = []
    for ring in raw:
        if ring is not main and area(ring) < 1.5: continue
        cx = sum(p[0] for p in ring) / len(ring); cy = sum(p[1] for p in ring) / len(ring)
        if math.hypot(cx - mx, cy - my) > reach: continue
        s2 = simplify_ring(ring, 0.6)
        if len(s2) >= 3: rings.append(s2)
    d = ' '.join('M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in r) + 'Z' for r in rings)
    xs = [p[0] for r in rings for p in r]; ys = [p[1] for r in rings for p in r]
    shapes[code] = {'d': d, 'box': [round(min(xs), 1), round(min(ys), 1), round(max(xs), 1), round(max(ys), 1)]}
    # 都道府県の中心（地図を寄せるとき用）：いちばん大きい島の外枠の真ん中を緯度経度に戻す
    cx, cy = mx, my
    if code == '47':
        cx, cy = cx - 5.5 * math.cos(math.radians(LAT0)) * 60, cy + 4.6 * 60
    prefs[code]['lat'] = round(46.0 - cy / 60, 3)
    prefs[code]['lng'] = round(cx / (math.cos(math.radians(LAT0)) * 60) + 128.0, 3)
allx = [v for s in shapes.values() for v in (s['box'][0], s['box'][2])]
ally = [v for s in shapes.values() for v in (s['box'][1], s['box'][3])]
view = [round(min(allx) - 4), round(min(ally) - 4), round(max(allx) - min(allx) + 8), round(max(ally) - min(ally) + 8)]
regions = [{'id': r[0], 'ja': r[1], 'en': r[2], 'zh': r[3], 'zt': r[4], 'ko': r[5], 'prefs': r[6]} for r in REGIONS]

# 北方領土の村は行き先として選べないので外す
HOPPO = {'色丹村', '泊村', '留夜別村', '留別村', '紗那村', '蘂取村'}
cities = [c for c in cities if not (c['pref'] == '01' and c['ja'] in HOPPO and c['id'] >= '01695')]

# 位置が取れなかった市町村（島の村など）は、都道府県の中心で代わりにする
for c in cities:
    if 'lat' not in c:
        c['lat'], c['lng'] = prefs[c['pref']]['lat'], prefs[c['pref']]['lng']

# ───── 書き出す ─────
os.makedirs(os.path.join(OUT, 'lib/data'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'public/data'), exist_ok=True)
pref_list = [prefs[k] for k in sorted(prefs)]
json.dump({'regions': regions, 'prefs': pref_list}, open(os.path.join(OUT, 'lib/data/prefs.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(cities, open(os.path.join(OUT, 'lib/data/cities.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(cities, open(os.path.join(OUT, 'public/data/cities.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump({'view': view, 'shapes': shapes}, open(os.path.join(OUT, 'public/data/japan-map.json'), 'w'), separators=(',', ':'))
for t in ['宇治市', '京都市', '千代田区', '大阪市', '那覇市', '札幌市', '箱根町', '白川村', '東京都']:
    print(t, [c for c in cities if c['ja'] == t][:1] or [p for p in pref_list if p['ja'] == t])
