// デモ用の店（sample = true）に、ジャンル・メニュー表・口コミ（架空）を足す。demo スキーマにだけ入れる。
//   DB_SCHEMA=demo dotenv -e .env.local -- node scripts/demo-enrich.js
// 何度実行しても同じ結果になる（口コミはデモ用の口コミだけ消して入れ直す）。翻訳 API は使わず、訳はここに書いてある。
import { DB_SCHEMA } from '../lib/dbUrl.js';
import { prisma } from '../lib/prisma.js'; // 接続が切れたら、つなぎ直してやり直す
import { sourceTexts } from '../lib/places.js';

if (DB_SCHEMA !== 'demo') {
  console.error(`デモのデータは demo スキーマにだけ入れます（今は "${DB_SCHEMA}"）。DB_SCHEMA=demo で実行してください。`);
  process.exit(1);
}

let seed = 20261020;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rand() * a.length)];
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const t5 = (ja, en, zh, zt, ko) => ({ ja, en, zh, zt, ko });
const LANGS = ['en', 'zh', 'zt', 'ko'];

// 店の名前（日本語）から、ジャンルとメニューの種類を決める
const KINDS = [
  [/茶園/, 'culture'],
  [/陶房/, 'craft'],
  [/菓子舗/, 'cooking'],
  [/酒造/, 'culture'],
  [/染工房/, 'craft'],
  [/農園/, 'nature'],
  [/書道/, 'culture'],
  [/そば打ち/, 'cooking'],
  [/食堂/, 'washoku', 'shokudo'],
  [/居酒屋/, 'izakaya', 'izakaya'],
  [/うどん/, 'washoku', 'udon'],
  [/鮨/, 'washoku', 'sushi'],
  [/喫茶/, 'cafe', 'kissa'],
  [/焼鳥/, 'izakaya', 'yakitori'],
  [/中華そば/, 'chuka', 'ramen'],
  [/郷土料理/, 'washoku', 'kyodo'],
];

// メニュー：[料理名, 値段, 量, ひとこと]（それぞれ5言語）
const m = (name, price, amount, note) => ({ name, price, amount, note });
const MENUS = {
  shokudo: [
    m(t5('日替わり定食', 'Daily set meal', '每日套餐', '每日套餐', '오늘의 정식'), 850, t5('ごはん・みそ汁・小鉢付き', 'With rice, miso soup and a side dish', '附米饭、味噌汤和小菜', '附白飯、味噌湯和小菜', '밥・된장국・반찬 포함'), t5('ごはんのおかわり無料', 'Free rice refill', '米饭免费续', '白飯免費續', '밥 리필 무료')),
    m(t5('生姜焼き定食', 'Ginger pork set meal', '姜汁烧肉套餐', '薑汁燒肉套餐', '생강 돼지고기 구이 정식'), 950, t5('豚肉150g', 'Pork 150 g', '猪肉150克', '豬肉150克', '돼지고기 150g'), t5('', '', '', '', '')),
    m(t5('カレーライス', 'Curry and rice', '咖喱饭', '咖哩飯', '카레라이스'), 700, t5('ごはん300g', 'Rice 300 g', '米饭300克', '白飯300克', '밥 300g'), t5('少し甘めの家庭の味', 'Mild, home-style taste', '偏甜的家常口味', '偏甜的家常口味', '조금 달콤한 집밥 맛')),
  ],
  izakaya: [
    m(t5('お通し', 'Otoshi (small starter)', '小菜（お通し）', '小菜（お通し）', '오토시 (기본 안주)'), 400, t5('1人1品', 'One per person', '每人一份', '每人一份', '1인 1개'), t5('席に着くと出てきます', 'Served when you sit down', '入座后会端上', '入座後會端上', '자리에 앉으면 나와요')),
    m(t5('刺身の盛り合わせ', 'Assorted sashimi', '刺身拼盘', '生魚片拼盤', '모둠 회'), 1500, t5('2〜3人前', 'For 2–3 people', '2～3人份', '2～3人份', '2~3인분'), t5('その日の地魚', "Today's local fish", '当天的本地鱼', '當天的在地魚', '그날의 지역 생선')),
    m(t5('鶏の唐揚げ', 'Fried chicken (karaage)', '日式炸鸡', '日式炸雞', '닭튀김 (가라아게)'), 650, t5('5個', '5 pieces', '5块', '5塊', '5개'), t5('', '', '', '', '')),
  ],
  udon: [
    m(t5('かけうどん', 'Kake udon (plain)', '清汤乌冬面', '清湯烏龍麵', '가케 우동'), 500, t5('麺200g', 'Noodles 200 g', '面200克', '麵200克', '면 200g'), t5('出汁は昆布といりこ', 'Dashi from kelp and dried sardines', '用昆布和小鱼干熬的高汤', '用昆布和小魚乾熬的高湯', '다시마와 멸치 육수')),
    m(t5('きつねうどん', 'Kitsune udon (fried tofu)', '油豆腐乌冬面', '豆皮烏龍麵', '기쓰네 우동 (유부)'), 650, t5('麺200g', 'Noodles 200 g', '面200克', '麵200克', '면 200g'), t5('', '', '', '', '')),
    m(t5('天ぷらうどん', 'Tempura udon', '天妇罗乌冬面', '天婦羅烏龍麵', '튀김 우동'), 900, t5('えび天2本', '2 shrimp tempura', '2只炸虾', '2隻炸蝦', '새우튀김 2개'), t5('大盛りは＋150円', 'Large size +¥150', '大份加150日元', '大份加150日圓', '곱빼기 +150엔')),
  ],
  sushi: [
    m(t5('おまかせ握り', "Chef's choice nigiri", '主厨精选握寿司', '主廚精選握壽司', '오마카세 니기리'), 3500, t5('10貫', '10 pieces', '10贯', '10貫', '10피스'), t5('その日いちばんの魚で', "With the day's best fish", '用当天最好的鱼', '用當天最好的魚', '그날 가장 좋은 생선으로')),
    m(t5('ちらし寿司', 'Chirashi sushi bowl', '散寿司', '散壽司', '지라시 스시'), 2000, t5('1人前', 'One serving', '1人份', '1人份', '1인분'), t5('', '', '', '', '')),
    m(t5('かっぱ巻き', 'Cucumber roll', '黄瓜卷', '小黃瓜卷', '오이 말이'), 500, t5('6切れ', '6 pieces', '6块', '6塊', '6조각'), t5('魚を食べない方にも', 'Good if you do not eat fish', '不吃鱼的人也可以', '不吃魚的人也可以', '생선을 못 드시는 분께도')),
  ],
  kissa: [
    m(t5('ブレンドコーヒー', 'House blend coffee', '综合咖啡', '綜合咖啡', '블렌드 커피'), 500, t5('1杯', 'One cup', '1杯', '1杯', '1잔'), t5('一杯ずつハンドドリップ', 'Hand-dripped cup by cup', '一杯一杯手冲', '一杯一杯手沖', '한 잔씩 핸드드립')),
    m(t5('ナポリタン', 'Napolitan spaghetti', '拿坡里意面', '拿坡里義大利麵', '나폴리탄 스파게티'), 850, t5('1人前', 'One serving', '1人份', '1人份', '1인분'), t5('昔ながらのケチャップ味', 'Old-style ketchup flavor', '怀旧番茄酱口味', '懷舊番茄醬口味', '옛날식 케첩 맛')),
    m(t5('プリン', 'Custard pudding', '布丁', '布丁', '푸딩'), 450, t5('1個', 'One', '1个', '1個', '1개'), t5('', '', '', '', '')),
  ],
  yakitori: [
    m(t5('おまかせ5本', "Chef's choice 5 skewers", '主厨精选5串', '主廚精選5串', '오마카세 5꼬치'), 1200, t5('5本', '5 skewers', '5串', '5串', '5꼬치'), t5('塩かたれを選べます', 'Choose salt or sauce', '可选盐味或酱汁', '可選鹽味或醬汁', '소금 또는 소스 선택')),
    m(t5('ねぎま', 'Negima (chicken and leek)', '鸡肉葱串', '雞肉蔥串', '네기마 (닭고기와 파)'), 250, t5('1本', 'One skewer', '1串', '1串', '1꼬치'), t5('', '', '', '', '')),
    m(t5('日本酒', 'Nihonshu (sake)', '日本酒', '日本酒', '니혼슈 (사케)'), 700, t5('1合（180ml）', '180 ml', '1合（180毫升）', '1合（180毫升）', '1홉 (180ml)'), t5('冷や・燗どちらも', 'Cold or warm', '冷饮或温热都可以', '冷飲或溫熱都可以', '차게 또는 따뜻하게')),
  ],
  ramen: [
    m(t5('中華そば', 'Chuka soba (soy sauce ramen)', '酱油拉面', '醬油拉麵', '주카소바 (간장 라멘)'), 800, t5('麺150g', 'Noodles 150 g', '面150克', '麵150克', '면 150g'), t5('鶏がらと煮干しのスープ', 'Chicken and dried sardine soup', '鸡骨和小鱼干汤底', '雞骨和小魚乾湯頭', '닭뼈와 멸치 육수')),
    m(t5('チャーシューメン', 'Chashu ramen (with pork slices)', '叉烧拉面', '叉燒拉麵', '차슈멘'), 1100, t5('チャーシュー5枚', '5 slices of pork', '5片叉烧', '5片叉燒', '차슈 5장'), t5('', '', '', '', '')),
    m(t5('餃子', 'Gyoza dumplings', '煎饺', '煎餃', '교자 만두'), 400, t5('6個', '6 pieces', '6个', '6個', '6개'), t5('', '', '', '', '')),
  ],
  kyodo: [
    m(t5('郷土料理の御膳', 'Local cuisine set', '乡土料理套餐', '鄉土料理套餐', '향토 요리 정식'), 2200, t5('ごはん・汁物・小鉢4品', 'Rice, soup and 4 small dishes', '米饭、汤和4道小菜', '白飯、湯和4道小菜', '밥・국・작은 반찬 4종'), t5('季節で中身が変わります', 'Changes with the season', '内容随季节变化', '內容隨季節變化', '계절마다 바뀌어요')),
    m(t5('季節の煮物', 'Seasonal simmered dish', '时令炖菜', '季節燉菜', '제철 조림'), 600, t5('小鉢', 'Small bowl', '小碗', '小碗', '작은 그릇'), t5('出汁でやさしく炊いています', 'Gently simmered in dashi', '用高汤慢炖', '用高湯慢燉', '다시 육수로 부드럽게 조렸어요')),
    m(t5('地酒', 'Local sake', '本地酒', '在地酒', '지역 사케'), 700, t5('1合（180ml）', '180 ml', '1合（180毫升）', '1合（180毫升）', '1홉 (180ml)'), t5('', '', '', '', '')),
  ],
};

// 口コミを書く架空の旅行者（ログインはできない：パスワードなし）
const REVIEWERS = [
  ['Emma', 'en', null], ['Liam', 'en', null], ['Olivia', 'en', 'christian'], ['Aisha', 'en', 'muslim'], ['Raj', 'en', 'hindu'], ['Sarah', 'en', null],
  ['Wei', 'zh', null], ['Jing', 'zh', 'buddhist'], ['Mei-Ling', 'zt', null], ['Chih-Hao', 'zt', 'none'], ['Ji-woo', 'ko', null], ['Min-jun', 'ko', 'none'],
];
// 口コミの文（5言語）。[文, 合う星の範囲]
const COMMENTS = [
  [t5('店主さんがとても親切で、全部ていねいに説明してくれました。友だちの家に遊びに来たみたいでした。', 'The owner was so kind and explained everything. It felt like visiting a friend’s home.', '店主非常亲切，把一切都讲解得很仔细。感觉像去朋友家玩一样。', '店主非常親切，把一切都講解得很仔細。感覺像去朋友家玩一樣。', '주인분이 정말 친절하게 하나하나 설명해 주셨어요. 친구 집에 놀러 온 것 같았어요.'), [4, 5]],
  [t5('地元の人でいっぱいの小さなお店。シンプルだけど、とてもおいしかったです。', 'A small place full of locals. Simple, but really delicious.', '一家坐满本地人的小店。简单但非常好吃。', '一家坐滿在地人的小店。簡單但非常好吃。', '현지인으로 가득한 작은 가게. 소박하지만 정말 맛있었어요.'), [4, 5]],
  [t5('少し見つけにくいけれど、行く価値ありです。現金を持って行きましょう。', 'A little hard to find, but worth it. Bring cash.', '有点难找，但很值得。记得带现金。', '有點難找，但很值得。記得帶現金。', '찾기가 조금 어렵지만 갈 만한 가치가 있어요. 현금을 챙기세요.'), [3, 5]],
  [t5('静かで落ち着いた雰囲気。ゆっくりした午後にぴったりでした。', 'Quiet and relaxing. Perfect for a slow afternoon.', '安静又放松，非常适合悠闲的下午。', '安靜又放鬆，非常適合悠閒的下午。', '조용하고 차분한 분위기. 여유로운 오후에 딱이었어요.'), [4, 5]],
  [t5('にぎやかで楽しい！翻訳チャットで事前に聞いておいたので、注文も簡単でした。', 'Lively and fun! We asked questions in the translation chat beforehand, so ordering was easy.', '热闹又开心！提前用翻译聊天问好了，点餐也很轻松。', '熱鬧又開心！事先用翻譯聊天問好了，點餐也很輕鬆。', '활기차고 즐거웠어요! 미리 번역 채팅으로 물어봐서 주문도 쉬웠어요.'), [4, 5]],
  [t5('よかったけれど、混んでいて少し待ちました。', 'Good, but it was crowded and we waited a while.', '不错，但人很多，等了一会儿。', '不錯，但人很多，等了一會兒。', '좋았지만 붐벼서 조금 기다렸어요.'), [3, 4]],
  [t5('思っていたのと少し違いましたが、体験としては面白かったです。', 'Not quite what I expected, but an interesting experience.', '和想象的有点不一样，但作为体验很有意思。', '和想像的有點不一樣，但作為體驗很有意思。', '생각했던 것과 조금 달랐지만 경험으로는 재미있었어요.'), [2, 3]],
];

async function main() {
  const places = await prisma.place.findMany({ where: { sample: true } });
  console.log(`デモの店 ${places.length} 店にジャンル・メニュー・口コミを足します`);

  // 架空の旅行者
  const reviewers = [];
  for (const [i, [name, lang, religion]] of REVIEWERS.entries()) {
    const email = `demo-reviewer-${String(i + 1).padStart(2, '0')}@example.com`;
    const u = await prisma.user.upsert({
      where: { email_role: { email, role: 'TRAVELER' } },
      create: { email, role: 'TRAVELER', name, lang, currency: 'USD', termsAt: new Date() },
      update: { name, lang },
    });
    reviewers.push({ ...u, religion });
  }
  await prisma.review.deleteMany({ where: { sample: true } });

  let reviewCount = 0;
  for (const p of places) {
    const kind = KINDS.find(([re]) => re.test(p.name));
    const genre = kind?.[1] ?? (p.category === 'experience' ? 'other_exp' : 'washoku');
    const menuItems = kind?.[2] ? MENUS[kind[2]] : [];
    const menu = menuItems.map((x) => ({ name: x.name.ja, price: x.price, amount: x.amount.ja, note: x.note.ja }));
    // メニューの訳を、今の訳（i18n）に足す
    const i18n = { ...(p.i18n ?? {}) };
    for (const l of LANGS) {
      const base = { ...(i18n[l] ?? {}) };
      for (const k of Object.keys(base)) if (/^menu\d+/.test(k)) delete base[k];
      menuItems.forEach((x, i) => Object.assign(base, { [`menu${i}Name`]: x.name[l], [`menu${i}Amount`]: x.amount[l], [`menu${i}Note`]: x.note[l] }));
      i18n[l] = base;
    }
    // 訳のキーが原文とそろっているか確かめる
    const keys = Object.keys(sourceTexts({ ...p, menu })).filter((k) => k.startsWith('menu'));
    for (const l of LANGS) for (const k of keys) if (!(k in i18n[l])) throw new Error(`訳がない: ${p.name} ${l} ${k}`);
    await prisma.place.update({ where: { id: p.id }, data: { genre, menu, i18n } });

    // 口コミ 0〜9件
    const n = between(0, 9);
    const who = [...reviewers].sort(() => rand() - 0.5).slice(0, n);
    const rows = [];
    for (const r of who) {
      const rating = pick([5, 5, 5, 4, 4, 4, 4, 3, 3, 2]);
      const fits = COMMENTS.filter(([, [lo, hi]]) => rating >= lo && rating <= hi);
      const c = rand() < 0.2 || !fits.length ? null : pick(fits)[0];
      const withWhom = pick(['friends', 'friends', 'family', 'solo', 'partner', 'colleagues', 'other']);
      const people = withWhom === 'solo' ? 1 : withWhom === 'partner' ? 2 : between(2, 6);
      rows.push({
          placeId: p.id,
          travelerId: r.id,
          rating,
          withWhom,
          people,
          occasion: rand() < 0.8 ? pick(['everyday', 'sightseeing', 'sightseeing', 'date', 'birthday', 'anniversary', 'business']) : null,
          religion: r.religion && rand() < 0.7 ? r.religion : null,
          calm: rand() < 0.85 ? (p.category === 'restaurant' && /居酒屋|焼鳥/.test(p.name) ? between(1, 3) : between(3, 5)) : null,
          special: rand() < 0.85 ? between(1, 4) : null,
          comment: c ? c[r.lang] : '',
          lang: r.lang,
          i18n: c ? Object.fromEntries(['en', 'zh', 'zt', 'ko', 'ja'].filter((l) => l !== r.lang).map((l) => [l, c[l]])) : undefined,
          sample: true,
          createdAt: new Date(Date.now() - between(1, 120) * 86400000),
      });
    }
    if (rows.length) await prisma.review.createMany({ data: rows });
    reviewCount += rows.length;
  }
  console.log(`口コミ ${reviewCount} 件を入れました`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
