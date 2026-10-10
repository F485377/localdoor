// お店の情報を、選んだ言語で出すためのヘルパー
// お店の translations（{ ja: { description, rules, city, ... } }）に訳があればそれを使い、なければ英語のまま出す

const FIELDS = ['name', 'description', 'openingHours', 'dressCode', 'rules', 'ingredients', 'allergens', 'safetyNote'];

// OpenStreetMap の料理の種類（cuisine タグ）の訳。ここにないものは英語のまま
const CUISINES = {
  japanese: { ja: '和食', zh: '日本料理', ko: '일식' },
  regional: { ja: '郷土料理', zh: '地方菜', ko: '향토 요리' },
  local: { ja: '郷土料理', zh: '地方菜', ko: '향토 요리' },
  okinawan: { ja: '沖縄料理', zh: '冲绳料理', ko: '오키나와 요리' },
  ramen: { ja: 'ラーメン', zh: '拉面', ko: '라멘' },
  soba: { ja: 'そば', zh: '荞麦面', ko: '소바' },
  udon: { ja: 'うどん', zh: '乌冬面', ko: '우동' },
  noodle: { ja: '麺類', zh: '面食', ko: '면 요리' },
  sushi: { ja: '寿司', zh: '寿司', ko: '스시' },
  tempura: { ja: '天ぷら', zh: '天妇罗', ko: '덴푸라' },
  tonkatsu: { ja: 'とんかつ', zh: '炸猪排', ko: '돈카츠' },
  yakiniku: { ja: '焼肉', zh: '烤肉', ko: '야키니쿠' },
  yakitori: { ja: '焼き鳥', zh: '烤鸡串', ko: '야키토리' },
  okonomiyaki: { ja: 'お好み焼き', zh: '御好烧', ko: '오코노미야키' },
  takoyaki: { ja: 'たこ焼き', zh: '章鱼烧', ko: '타코야키' },
  izakaya: { ja: '居酒屋', zh: '居酒屋', ko: '이자카야' },
  teishoku: { ja: '定食', zh: '套餐', ko: '정식' },
  curry: { ja: 'カレー', zh: '咖喱', ko: '카레' },
  chinese: { ja: '中華料理', zh: '中餐', ko: '중식' },
  korean: { ja: '韓国料理', zh: '韩国料理', ko: '한식' },
  taiwanese: { ja: '台湾料理', zh: '台湾菜', ko: '대만 요리' },
  thai: { ja: 'タイ料理', zh: '泰国菜', ko: '태국 요리' },
  vietnamese: { ja: 'ベトナム料理', zh: '越南菜', ko: '베트남 요리' },
  indian: { ja: 'インド料理', zh: '印度菜', ko: '인도 요리' },
  nepalese: { ja: 'ネパール料理', zh: '尼泊尔菜', ko: '네팔 요리' },
  asian: { ja: 'アジア料理', zh: '亚洲菜', ko: '아시아 요리' },
  italian: { ja: 'イタリアン', zh: '意大利菜', ko: '이탈리안' },
  pizza: { ja: 'ピザ', zh: '披萨', ko: '피자' },
  pasta: { ja: 'パスタ', zh: '意面', ko: '파스타' },
  french: { ja: 'フレンチ', zh: '法国菜', ko: '프렌치' },
  spanish: { ja: 'スペイン料理', zh: '西班牙菜', ko: '스페인 요리' },
  mexican: { ja: 'メキシコ料理', zh: '墨西哥菜', ko: '멕시코 요리' },
  american: { ja: 'アメリカ料理', zh: '美式', ko: '미국 요리' },
  international: { ja: '多国籍料理', zh: '国际料理', ko: '다국적 요리' },
  burger: { ja: 'ハンバーガー', zh: '汉堡', ko: '햄버거' },
  steak_house: { ja: 'ステーキ', zh: '牛排', ko: '스테이크' },
  'steak house': { ja: 'ステーキ', zh: '牛排', ko: '스테이크' },
  barbecue: { ja: 'バーベキュー', zh: '烧烤', ko: '바비큐' },
  bbq: { ja: 'バーベキュー', zh: '烧烤', ko: '바비큐' },
  chicken: { ja: '鶏料理', zh: '鸡肉料理', ko: '치킨' },
  fried_chicken: { ja: 'フライドチキン', zh: '炸鸡', ko: '프라이드치킨' },
  'fried chicken': { ja: 'フライドチキン', zh: '炸鸡', ko: '프라이드치킨' },
  seafood: { ja: '海鮮', zh: '海鲜', ko: '해산물' },
  fish: { ja: '魚料理', zh: '鱼料理', ko: '생선 요리' },
  sandwich: { ja: 'サンドイッチ', zh: '三明治', ko: '샌드위치' },
  breakfast: { ja: '朝食', zh: '早餐', ko: '아침 식사' },
  coffee_shop: { ja: '喫茶店', zh: '咖啡店', ko: '커피숍' },
  'coffee shop': { ja: '喫茶店', zh: '咖啡店', ko: '커피숍' },
  tea: { ja: 'お茶', zh: '茶', ko: '차' },
  bubble_tea: { ja: 'タピオカドリンク', zh: '珍珠奶茶', ko: '버블티' },
  'bubble tea': { ja: 'タピオカドリンク', zh: '珍珠奶茶', ko: '버블티' },
  cake: { ja: 'ケーキ', zh: '蛋糕', ko: '케이크' },
  dessert: { ja: 'デザート', zh: '甜点', ko: '디저트' },
  ice_cream: { ja: 'アイスクリーム', zh: '冰淇淋', ko: '아이스크림' },
  'ice cream': { ja: 'アイスクリーム', zh: '冰淇淋', ko: '아이스크림' },
  donut: { ja: 'ドーナツ', zh: '甜甜圈', ko: '도넛' },
  crepe: { ja: 'クレープ', zh: '可丽饼', ko: '크레이프' },
  bakery: { ja: 'パン', zh: '面包', ko: '베이커리' },
  kebab: { ja: 'ケバブ', zh: '烤肉串', ko: '케밥' },
  vegetarian: { ja: 'ベジタリアン', zh: '素食', ko: '채식' },
  vegan: { ja: 'ヴィーガン', zh: '纯素', ko: '비건' },
};

// OpenStreetMap の営業時間の書き方（Mo-Fr 11:00-22:00; Su off）の曜日を訳す
const DAYS = {
  ja: { Mo: '月', Tu: '火', We: '水', Th: '木', Fr: '金', Sa: '土', Su: '日', PH: '祝日', off: '休み', closed: '休み' },
  zh: { Mo: '周一', Tu: '周二', We: '周三', Th: '周四', Fr: '周五', Sa: '周六', Su: '周日', PH: '节假日', off: '休息', closed: '休息' },
  ko: { Mo: '월', Tu: '화', We: '수', Th: '목', Fr: '금', Sa: '토', Su: '일', PH: '공휴일', off: '휴무', closed: '휴무' },
};

function translateHours(hours, lang) {
  const days = DAYS[lang];
  if (!hours || !days) return hours;
  return hours.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH|off|closed)\b/g, (d) => days[d]);
}

export const cuisineLabel = (c, lang) => CUISINES[c]?.[lang] ?? c;

// お店の都市名（例: Naha → 那覇）
export const placeCity = (place, lang) => place.translations?.[lang]?.city ?? place.city;

// 都市の一覧（citiesOf で作ったもの）の表示名
export const cityLabel = (city, lang) => city.names?.[lang] ?? city.name;

// 訳があれば上書きしたお店を返す。city は絞り込みに使うので変えず、表示用の cityLabel を足す
export function localizePlace(place, lang) {
  const tr = place.translations?.[lang] ?? {};
  const out = { ...place, cityLabel: placeCity(place, lang) };
  for (const key of FIELDS) if (tr[key] != null) out[key] = tr[key];
  if (tr.openingHours == null) out.openingHours = translateHours(place.openingHours, lang);
  out.cuisine = (place.cuisine ?? []).map((c) => cuisineLabel(c, lang));
  return out;
}
