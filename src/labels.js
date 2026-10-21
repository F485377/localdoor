// 選択肢の表示名。旅行者画面は en / zh（簡体字）/ zt（繁体字）/ ko、事業者画面は ja
import { BAND_RANGE } from '../lib/domain.js';
import { GENRE_NAMES } from '../lib/genres.js';
import { prefOf, regionOf } from '../lib/japan.js';

const v = (en, zh, zt, ko, ja) => ({ en, zh, zt, ko, ja });

export const L = {
  category: {
    experience: v('Experience', '体验', '體驗', '체험', '体験'),
    restaurant: v('Restaurant', '餐厅', '餐廳', '음식점', '飲食店'),
  },
  genre: GENRE_NAMES,
  withWhom: {
    solo: v('Alone', '一个人', '一個人', '혼자', 'ひとりで'),
    friends: v('With friends', '和朋友', '和朋友', '친구와', '友人・知人と'),
    family: v('With family', '和家人', '和家人', '가족과', '家族と'),
    partner: v('With a partner', '和伴侣', '和伴侶', '연인・배우자와', '恋人・夫婦で'),
    colleagues: v('With colleagues', '和同事', '和同事', '동료와', '職場の人と'),
    other: v('Other', '其他', '其他', '기타', 'その他'),
  },
  occasion: {
    everyday: v('Everyday meal', '日常用餐', '日常用餐', '평소 식사', '普段の食事'),
    sightseeing: v('Sightseeing', '观光', '觀光', '관광', '観光の途中'),
    date: v('Date', '约会', '約會', '데이트', 'デート'),
    birthday: v('Birthday', '生日', '生日', '생일', '誕生日'),
    anniversary: v('Anniversary / surprise', '纪念日・惊喜', '紀念日・驚喜', '기념일・서프라이즈', '記念日・サプライズ'),
    business: v('Business', '商务', '商務', '비즈니스', '接待・仕事'),
    other: v('Other', '其他', '其他', '기타', 'その他'),
  },
  religion: {
    muslim: v('Muslim', '穆斯林', '穆斯林', '무슬림', 'イスラム教'),
    hindu: v('Hindu', '印度教', '印度教', '힌두교', 'ヒンドゥー教'),
    buddhist: v('Buddhist', '佛教', '佛教', '불교', '仏教'),
    christian: v('Christian', '基督教', '基督教', '기독교', 'キリスト教'),
    jewish: v('Jewish', '犹太教', '猶太教', '유대교', 'ユダヤ教'),
    none: v('No religion', '无宗教', '無宗教', '무교', '特になし'),
    other: v('Other', '其他', '其他', '기타', 'その他'),
  },
  years: {
    gt30: v('30+ years', '30年以上', '30年以上', '30년 이상', '30年以上'),
    '10to30': v('10–30 years', '10–30年', '10–30年', '10–30년', '10〜30年'),
    lt10: v('Under 10 years', '不到10年', '未滿10年', '10년 미만', '10年未満'),
  },
  paymentMethod: {
    cash: v('Cash', '现金', '現金', '현금', '現金'),
    card: v('Credit card', '信用卡', '信用卡', '신용카드', 'クレジットカード'),
    ic: v('IC card (Suica etc.)', '交通IC卡（Suica等）', '交通IC卡（Suica等）', '교통 IC카드 (Suica 등)', '交通系ICカード'),
    qr: v('QR pay (PayPay, Alipay…)', '扫码支付（支付宝等）', '掃碼支付（支付寶等）', 'QR 결제 (PayPay・알리페이 등)', 'QRコード決済'),
  },
  payment: {
    cash: v('Cash only', '仅限现金', '僅限現金', '현금만', '現金のみ'),
    card: v('Cash or card', '现金或刷卡', '現金或刷卡', '현금 또는 카드', 'カード可'),
  },
  menuStyle: {
    course: v('Set course', '套餐', '套餐', '코스', 'コース'),
    alacarte: v('À la carte', '单点', '單點', '단품', 'アラカルト'),
    both: v('Course or à la carte', '套餐或单点', '套餐或單點', '코스 또는 단품', 'コース・アラカルト両方'),
  },
  dietSupport: {
    vegetarian: v('Vegetarian', '素食', '素食', '채식', 'ベジタリアン'),
    vegan: v('Vegan', '纯素', '純素', '비건', 'ヴィーガン'),
    halal: v('Halal (self-declared)', '清真（店家自述）', '清真（店家自述）', '할랄 (가게 자체 신고)', 'ハラール（店の申告）'),
    gluten_free: v('Gluten-free', '无麸质', '無麩質', '글루텐 프리', 'グルテンフリー'),
    allergy: v('Allergies (ask)', '可咨询过敏', '可詢問過敏', '알레르기 상담 가능', 'アレルギー相談可'),
  },
  diet: {
    vegetarian: v('Vegetarian', '素食', '素食', '채식', 'ベジタリアン'),
    vegan: v('Vegan', '纯素', '純素', '비건', 'ヴィーガン'),
    halal: v('Halal', '清真', '清真', '할랄', 'ハラール'),
    no_pork: v('No pork', '不吃猪肉', '不吃豬肉', '돼지고기 제외', '豚肉なし'),
    no_alcohol: v('No alcohol', '不含酒精', '不含酒精', '알코올 제외', 'アルコールなし'),
    gluten_free: v('Gluten-free', '无麸质', '無麩質', '글루텐 프리', 'グルテンフリー'),
    allergy_egg: v('Egg', '鸡蛋', '雞蛋', '달걀', '卵'),
    allergy_milk: v('Milk', '牛奶', '牛奶', '우유', '乳'),
    allergy_wheat: v('Wheat', '小麦', '小麥', '밀', '小麦'),
    allergy_buckwheat: v('Buckwheat', '荞麦', '蕎麥', '메밀', 'そば'),
    allergy_peanut: v('Peanut', '花生', '花生', '땅콩', '落花生'),
    allergy_shrimp: v('Shrimp', '虾', '蝦', '새우', 'えび'),
    allergy_crab: v('Crab', '蟹', '蟹', '게', 'かに'),
    allergy_walnut: v('Walnut', '核桃', '核桃', '호두', 'くるみ'),
    allergy_soy: v('Soy', '大豆', '大豆', '대두', '大豆'),
    allergy_sesame: v('Sesame', '芝麻', '芝麻', '참깨', 'ごま'),
    allergy_fish: v('Fish', '鱼', '魚', '생선', '魚'),
    allergy_shellfish: v('Shellfish', '贝类', '貝類', '조개류', '貝類'),
  },
  smoking: {
    none: v('No smoking', '全面禁烟', '全面禁菸', '전면 금연', '全面禁煙'),
    separated: v('Smoking area', '分区吸烟', '分區吸菸', '흡연 구역 있음', '分煙'),
    allowed: v('Smoking allowed', '可吸烟', '可吸菸', '흡연 가능', '喫煙可'),
  },
  pets: {
    ok: v('Pets welcome', '可带宠物', '可帶寵物', '반려동물 동반 가능', 'ペット同伴可'),
    no: v('No pets', '不可带宠物', '不可帶寵物', '반려동물 동반 불가', 'ペット不可'),
  },
  privateRoom: {
    true: v('Private room', '有包间', '有包廂', '개별실 있음', '個室あり'),
    false: v('No private room', '无包间', '無包廂', '개별실 없음', '個室なし'),
  },
  cancelReason: {
    closed: v('The place is closed that day', '店铺当天临时休息', '店家當天臨時公休', '그날 가게가 임시 휴업합니다', '臨時休業'),
    weather: v('Weather', '天气原因', '天候因素', '날씨', '天候'),
    other: v('Other reason', '其他原因', '其他原因', '기타 사유', 'その他'),
  },
  report: {
    fake: v("This place doesn't seem to exist", '这家店似乎不存在', '這家店似乎不存在', '실제로 없는 가게 같아요', '実在しないようだ'),
    wrong: v('The information is wrong or exaggerated', '信息有误或夸大', '資訊有誤或誇大', '정보가 틀리거나 과장되었어요', '情報が違う・誇張されている'),
    inappropriate: v('Inappropriate content', '内容不当', '內容不當', '부적절한 내용', '不適切な内容'),
    other: v('Other', '其他', '其他', '기타', 'その他'),
  },
};

export const label = (group, value, lang = 'en') => L[group]?.[String(value)]?.[lang] ?? L[group]?.[String(value)]?.en ?? value ?? '';
export const options = (group, values, lang = 'en') => values.map((x) => ({ value: x, label: label(group, x, lang) }));

// 都道府県・地方・市区町村の名前（中国語は日本の漢字のまま）
export const prefName = (code, lang = 'en') => prefOf(code)?.[lang] ?? prefOf(code)?.en ?? '';
export const regionName = (id, lang = 'en') => regionOf(id)?.[lang] ?? regionOf(id)?.en ?? '';
export const cityName = (city, lang = 'en') => (!city ? '' : lang === 'en' || lang === 'ko' ? city[lang] : city.ja);

// 店のある場所：宇治 · 京都府
export const placeWhere = (p, lang = 'en') => [cityName(p.city, lang), prefName(p.pref, lang)].filter(Boolean).join(' · ');

export const WEEKDAYS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  zh: ['日', '一', '二', '三', '四', '五', '六'],
  zt: ['日', '一', '二', '三', '四', '五', '六'],
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  ja: ['日', '月', '火', '水', '木', '金', '土'],
};

// 値段帯：¥1,000〜3,000（日本語・事業者画面では 1,000〜3,000円）
export function bandText(band, lang = 'en') {
  const r = BAND_RANGE[band];
  if (!r) return '';
  const n = (x) => x.toLocaleString('en-US');
  if (lang === 'ja') {
    if (r[0] === 0) return `〜${n(r[1])}円`;
    if (r[1] == null) return `${n(r[0])}円〜`;
    return `${n(r[0])}〜${n(r[1])}円`;
  }
  if (r[0] === 0) return `〜¥${n(r[1])}`;
  if (r[1] == null) return `¥${n(r[0])}〜`;
  return `¥${n(r[0])}〜${n(r[1])}`;
}

export function duration(min, lang = 'en') {
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  const unit = { en: [' h', ' min', ' '], zh: ['小时', '分钟', ''], zt: ['小時', '分鐘', ''], ko: ['시간', '분', ' '], ja: ['時間', '分', ''] }[lang] ?? [' h', ' min', ' '];
  return [h && `${h}${unit[0]}`, m && `${m}${unit[1]}`].filter(Boolean).join(unit[2]);
}

// 写真の代わりのイラスト（PlaceArt）は日本語の店名から絵を選ぶので、日本語名と訳した名前の両方を渡す
export const artInput = (p) => ({ id: p.id, category: p.category, name: p.nameJa ?? p.name, i18n: { en: { name: p.name } } });

