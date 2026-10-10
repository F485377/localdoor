// OpenStreetMap から、指定した都市の飲食店を取り込んで DB に入れる。
//
//   npm run osm:import -- --city "Naha"
//   npm run osm:import -- --city "Seoul" --limit 300
//   npm run osm:import -- --city "New York" --tz America/New_York
//
// 同じお店をもう一度取り込むと、OSM の情報だけ上書きされる（Haisai が足した服装・ルールなどは消えない）。
// データは © OpenStreetMap contributors（ODbL）。画面に出典を出すこと。
import { PrismaClient } from '@prisma/client';
import { COUNTRY_INFO } from '../lib/countries.js';

// 公開サーバーの利用ルールに従い、アプリ名を名乗り、1回にたくさん取りすぎない
const USER_AGENT = 'Haisai/0.1 (travel app prototype; https://github.com/)';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
// 公開の Overpass サーバーはよく混むので、つながらなければ次のサーバーを試す
const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

function parseArgs(argv) {
  const args = { limit: 200 };
  for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1];
  args.limit = Math.min(Number(args.limit) || 200, 1000);
  return args;
}

// 都市名 → OSM 上の範囲（Nominatim で探す）
async function findCity(name) {
  const url = `${NOMINATIM}?${new URLSearchParams({ q: name, format: 'jsonv2', limit: '1', addressdetails: '1', namedetails: '1', 'accept-language': 'en' })}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim error ${res.status}`);
  const [hit] = await res.json();
  if (!hit) throw new Error(`「${name}」という都市が見つかりませんでした`);
  return {
    name: hit.address?.city || hit.address?.town || hit.address?.village || hit.name || name,
    country: (hit.address?.country_code ?? '').toUpperCase(),
    areaId: hit.osm_type === 'relation' ? 3600000000 + Number(hit.osm_id) : null,
    bbox: hit.boundingbox.map(Number), // [south, north, west, east]
    names: hit.namedetails ?? {}, // { 'name:ja': '那覇市', ... }
  };
}

async function fetchPlaces(city, limit) {
  const [s, n, w, e] = city.bbox;
  const scope = city.areaId ? `area(id:${city.areaId})->.a;` : '';
  const filter = city.areaId ? '(area.a)' : `(${s},${w},${n},${e})`;
  const query = `[out:json][timeout:90];${scope}
nwr["amenity"~"^(restaurant|fast_food|food_court|cafe|bar|pub|biergarten)$"]["name"]${filter};
out center tags qt ${limit};`;
  for (const server of OVERPASS_SERVERS) {
    try {
      const res = await fetch(server, {
        method: 'POST',
        headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(100_000),
      });
      if (res.ok) return (await res.json()).elements;
      console.warn(`  ${new URL(server).host} が混んでいます（${res.status}）。次のサーバーを試します…`);
    } catch (err) {
      console.warn(`  ${new URL(server).host} につながりません（${err.name}）。次のサーバーを試します…`);
    }
  }
  throw new Error('OpenStreetMap のサーバーがすべて混んでいます。少し時間をおいてもう一度試してください。');
}

const CATEGORY = {
  restaurant: 'restaurant',
  fast_food: 'restaurant',
  food_court: 'restaurant',
  cafe: 'cafe',
  bar: 'bar',
  pub: 'bar',
  biergarten: 'bar',
};

// "yes" / "only" → true、"no" → false、書かれていなければ null（わからない）
const yesNo = (v) => (v === undefined ? null : ['yes', 'only', 'limited'].includes(v) ? true : v === 'no' ? false : null);

function cardAccepted(t) {
  const cards = ['credit_cards', 'debit_cards', 'visa', 'mastercard', 'american_express', 'jcb', 'unionpay'];
  if (cards.some((c) => t[`payment:${c}`] === 'yes')) return true;
  if (t['payment:cash'] === 'only' || cards.some((c) => t[`payment:${c}`] === 'no')) return false;
  return null;
}

function address(t) {
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
  return [t['addr:full'], street, t['addr:city']].filter(Boolean).join(', ') || null;
}

// アプリで選べる言語（英語以外）。店名・都市名の訳を OSM の name:ja などから取る
const LANGS = ['ja', 'zh', 'ko'];

function translations(t, city) {
  const out = {};
  for (const lang of LANGS) {
    const tr = {};
    // 現地の言葉と同じ名前なら localName と同じなので入れない
    if (t[`name:${lang}`] && t[`name:${lang}`] !== t.name) tr.name = t[`name:${lang}`];
    const cityName = city.names[`name:${lang}`];
    if (cityName) tr.city = cityName.replace(/[市区町村]$/, '') || cityName;
    if (Object.keys(tr).length) out[lang] = tr;
  }
  return out;
}

function toPlace(el, city, tz, currency) {
  const t = el.tags;
  const vegetarian = yesNo(t['diet:vegetarian']) ?? (yesNo(t['diet:vegan']) || null);
  return {
    source: 'osm',
    osmId: `${el.type}/${el.id}`,
    name: t['name:en'] || t.name,
    localName: t.name,
    category: CATEGORY[t.amenity] ?? 'restaurant',
    cuisine: (t.cuisine ?? '').split(';').map((c) => c.trim().replace(/_/g, ' ')).filter(Boolean),
    address: address(t),
    city: city.name,
    country: city.country,
    timeZone: tz,
    currency,
    lat: el.lat ?? el.center.lat,
    lng: el.lon ?? el.center.lon,
    openingHours: t.opening_hours ?? null,
    phone: t.phone || t['contact:phone'] || null,
    website: t.website || t['contact:website'] || null,
    englishMenu: yesNo(t['menu:en']),
    cardAccepted: cardAccepted(t),
    halal: yesNo(t['diet:halal']),
    vegetarian,
    translations: translations(t, city),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.city) {
    console.error('使い方: npm run osm:import -- --city "Naha" [--limit 200] [--tz Asia/Tokyo] [--currency JPY]');
    process.exit(1);
  }

  const city = await findCity(args.city);
  const [defaultTz, defaultCurrency] = COUNTRY_INFO[city.country] ?? [];
  const tz = args.tz ?? defaultTz;
  const currency = args.currency ?? defaultCurrency;
  if (!tz || !currency) {
    console.error(`国 ${city.country} のタイムゾーン・通貨がわかりません。--tz と --currency を指定してください。`);
    process.exit(1);
  }
  console.log(`${city.name} (${city.country}, ${tz}, ${currency}) のお店を OpenStreetMap から取得中…`);

  const elements = await fetchPlaces(city, args.limit);
  const prisma = new PrismaClient();
  let created = 0;
  let updated = 0;
  try {
    for (const el of elements) {
      const data = toPlace(el, city, tz, currency);
      const existing = await prisma.place.findUnique({ where: { osmId: data.osmId }, select: { id: true } });
      await prisma.place.upsert({ where: { osmId: data.osmId }, create: data, update: data });
      existing ? updated++ : created++;
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log(`完了：新しく ${created} 件、更新 ${updated} 件（© OpenStreetMap contributors）`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
