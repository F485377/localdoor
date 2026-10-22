// デモ用の架空の店を全国に入れる（発表・確認用）。本番用のスキーマ（mvp）には入れない。
//   npm run demo:push   … demo スキーマにテーブルを作る
//   npm run demo:seed   … demo スキーマの中身を消して、架空の店を入れ直す（既定 300 店）
//   npm run dev:demo    … demo スキーマを使う開発サーバー（http://localhost:5174）
// 店はすべて架空で、sample = true（画面に「サンプル」と出る）。写真はなく、カテゴリに合ったイラストを出す。
// 名前・説明などは、ひな形を組み合わせて 日本語・英語・簡体字・繁体字・韓国語 で作る（翻訳 API は使わない）。
// 事業者のアカウントは demo-shop-001@example.com 〜、パスワードは DEMO_PASSWORD（.env.local に入れる。既定の値はない）
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth.js';
import { cities } from '../lib/cities.js';
import { DB_SCHEMA, withSchema } from '../lib/dbUrl.js';
import { PREFS } from '../lib/japan.js';

if (DB_SCHEMA !== 'demo') {
  console.error(`デモの店は demo スキーマにだけ入れます（今は "${DB_SCHEMA}"）。DB_SCHEMA=demo で実行してください。`);
  process.exit(1);
}
if (!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD.length < 16) {
  console.error('DEMO_PASSWORD（16文字以上のランダムな値）を .env.local に入れてから実行してください。');
  process.exit(1);
}
const COUNT = Number(process.argv[2]) || 300;
const prisma = new PrismaClient({ datasourceUrl: withSchema(process.env.DATABASE_URL) });

// 毎回同じ店になるよう、決まった乱数を使う
let seed = 20261016;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rand() * a.length)];
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

const L = ['ja', 'en', 'zh', 'zt', 'ko'];
const t5 = (ja, en, zh, zt, ko) => ({ ja, en, zh, zt, ko });

// 名字（店の名前に使う）
const SURNAMES = [
  t5('山田', 'Yamada', '山田', '山田', '야마다'), t5('佐藤', 'Sato', '佐藤', '佐藤', '사토'), t5('鈴木', 'Suzuki', '铃木', '鈴木', '스즈키'),
  t5('高橋', 'Takahashi', '高桥', '高橋', '다카하시'), t5('田中', 'Tanaka', '田中', '田中', '다나카'), t5('伊藤', 'Ito', '伊藤', '伊藤', '이토'),
  t5('渡辺', 'Watanabe', '渡边', '渡邊', '와타나베'), t5('中村', 'Nakamura', '中村', '中村', '나카무라'), t5('小林', 'Kobayashi', '小林', '小林', '고바야시'),
  t5('加藤', 'Kato', '加藤', '加藤', '가토'), t5('吉田', 'Yoshida', '吉田', '吉田', '요시다'), t5('松本', 'Matsumoto', '松本', '松本', '마쓰모토'),
  t5('井上', 'Inoue', '井上', '井上', '이노우에'), t5('木村', 'Kimura', '木村', '木村', '기무라'), t5('清水', 'Shimizu', '清水', '清水', '시미즈'),
  t5('森', 'Mori', '森', '森', '모리'), t5('池田', 'Ikeda', '池田', '池田', '이케다'), t5('橋本', 'Hashimoto', '桥本', '橋本', '하시모토'),
  t5('石川', 'Ishikawa', '石川', '石川', '이시카와'), t5('前田', 'Maeda', '前田', '前田', '마에다'),
];

// 店の種類。name は {s}（名字）を差し込む
const KINDS = [
  {
    category: 'experience', band: '3000to5000', price: [3500, 5000], duration: 90, belong: t5('特になし', 'Nothing special', '无', '無', '특별히 없음'),
    name: t5('{s}茶園 抹茶体験', '{s} Tea Farm Matcha Experience', '{s}茶园 抹茶体验', '{s}茶園 抹茶體驗', '{s} 차밭 말차 체험'),
    desc: t5('家族で続ける小さな茶園です。普段は近所の方がお茶を買いに来ます。茶畑を歩いて、石臼で挽いた抹茶を自分で点てて味わいます。',
      'A small family-run tea farm where neighbors usually come to buy tea. Walk the tea fields, then whisk and taste matcha ground on a stone mill.',
      '这是一家世代经营的小茶园，平时附近居民会来买茶。参观茶田后，亲手点一碗用石磨研磨的抹茶并品尝。',
      '這是一家世代經營的小茶園，平時附近居民會來買茶。參觀茶田後，親手點一碗用石磨研磨的抹茶並品嚐。',
      '가족이 이어 온 작은 차밭입니다. 평소에는 이웃들이 차를 사러 옵니다. 차밭을 걸은 뒤 맷돌로 간 말차를 직접 저어 맛봅니다.'),
    pop: t5('石臼挽き抹茶と和菓子', 'Stone-ground matcha with a sweet', '石磨抹茶配和果子', '石磨抹茶配和菓子', '맷돌 말차와 화과자'), popPrice: 1200,
    kod: t5('祖父の代から同じ石臼を使い、毎朝お茶の香りを確かめています。', 'We still use the stone mill from my grandfather’s time and check the aroma every morning.', '一直使用祖父那一代的石磨，每天早上确认茶香。', '一直使用祖父那一代的石磨，每天早上確認茶香。', '할아버지 때부터 쓰던 맷돌을 지금도 쓰며, 매일 아침 차의 향을 확인합니다.'),
  },
  {
    category: 'experience', band: '3000to5000', price: [3000, 4500], duration: 120, belong: t5('汚れてもよい服', 'Clothes that can get dirty', '可以弄脏的衣服', '可以弄髒的衣服', '더러워져도 되는 옷'),
    name: t5('{s}陶房 器づくり', '{s} Pottery Studio', '{s}陶坊 陶艺体验', '{s}陶坊 陶藝體驗', '{s} 도예 공방'),
    desc: t5('地元の土で日用の器を作る小さな工房です。ろくろか手びねりで、自分の湯のみやお皿を作れます。焼き上げて後日お送りします。',
      'A small studio making everyday tableware from local clay. Shape your own cup or plate on the wheel or by hand; we fire it and ship it to you later.',
      '用当地黏土制作日常器皿的小工坊。可以用拉坯或手捏制作自己的茶杯或盘子，烧制后寄给您。',
      '用在地黏土製作日常器皿的小工坊。可以用拉坯或手捏製作自己的茶杯或盤子，燒製後寄給您。',
      '지역 흙으로 생활 그릇을 만드는 작은 공방입니다. 물레나 손빚기로 나만의 찻잔이나 접시를 만들 수 있고, 구운 뒤 보내 드립니다.'),
    pop: t5('ろくろ体験', 'Wheel-throwing session', '拉坯体验', '拉坯體驗', '물레 체험'), popPrice: 4000,
    kod: t5('近くの山の土を自分たちで掘り、季節ごとに土の具合を変えています。', 'We dig clay from the nearby hills ourselves and adjust it with the seasons.', '我们亲自到附近山上挖土，并随季节调整黏土。', '我們親自到附近山上挖土，並隨季節調整黏土。', '근처 산에서 직접 흙을 파 오고, 계절마다 흙 상태를 맞춥니다.'),
  },
  {
    category: 'experience', band: '1000to3000', price: [2500, 3000], duration: 60, belong: t5('特になし', 'Nothing special', '无', '無', '특별히 없음'),
    name: t5('{s}菓子舗 和菓子づくり', '{s} Confectionery Wagashi Class', '{s}果子铺 和果子制作', '{s}菓子舖 和菓子製作', '{s} 과자점 화과자 만들기'),
    desc: t5('町の人が毎日のおやつを買いに来る和菓子屋です。季節の練り切りを2つ作り、お茶と一緒に味わいます。',
      'A neighborhood sweet shop where locals buy their daily treats. Make two seasonal nerikiri sweets and enjoy them with tea.',
      '当地人每天来买点心的和果子店。亲手制作两个当季的练切点心，配茶品尝。',
      '在地人每天來買點心的和菓子店。親手製作兩個當季的練切點心，配茶品嚐。',
      '동네 사람들이 매일 간식을 사러 오는 화과자 가게입니다. 제철 네리키리 두 개를 만들어 차와 함께 맛봅니다.'),
    pop: t5('季節の練り切り', 'Seasonal nerikiri', '当季练切', '當季練切', '제철 네리키리'), popPrice: 300,
    kod: t5('あんこは毎朝炊き、甘さを控えめにしています。', 'We cook our red bean paste every morning and keep it lightly sweet.', '红豆馅每天早上现煮，甜度适中。', '紅豆餡每天早上現煮，甜度適中。', '팥소는 매일 아침 쑤고, 단맛을 줄였습니다.'),
  },
  {
    category: 'experience', band: '1000to3000', price: [1500, 2500], duration: 60, belong: t5('身分証（試飲する方）', 'ID (for tasting)', '身份证件（品酒者）', '身分證件（品酒者）', '신분증(시음하는 분)'),
    name: t5('{s}酒造 蔵見学', '{s} Brewery Tour', '{s}酒造 酒窖参观', '{s}酒造 酒窖參觀', '{s} 양조장 견학'),
    desc: t5('地元の米と水で酒を造る小さな蔵です。普段は地元の酒屋さんに卸しています。仕込み蔵を見て、搾りたてを試飲できます。',
      'A small brewery making sake from local rice and water, mostly sold to local liquor shops. See the brewing rooms and taste fresh sake.',
      '用当地大米和水酿酒的小酒窖，平时主要供应当地酒铺。参观酿造间，品尝新酿的酒。',
      '用在地米和水釀酒的小酒窖，平時主要供應在地酒鋪。參觀釀造間，品嚐新釀的酒。',
      '지역 쌀과 물로 술을 빚는 작은 양조장으로, 평소에는 동네 술집에 납품합니다. 양조실을 보고 갓 짠 술을 시음할 수 있습니다.'),
    pop: t5('搾りたて純米酒', 'Fresh junmai sake', '新酿纯米酒', '新釀純米酒', '갓 짠 준마이슈'), popPrice: 1800,
    kod: t5('米は地元の農家さんと一緒に育てています。', 'We grow our rice together with local farmers.', '大米是和当地农家一起种植的。', '米是和在地農家一起種植的。', '쌀은 지역 농가와 함께 기릅니다.'),
  },
  {
    category: 'experience', band: '3000to5000', price: [3000, 4000], duration: 90, belong: t5('エプロン（貸し出しあり）', 'Apron (we can lend one)', '围裙（可借用）', '圍裙（可借用）', '앞치마(대여 가능)'),
    name: t5('{s}染工房 藍染め', '{s} Indigo Dyeing Workshop', '{s}染坊 蓝染', '{s}染坊 藍染', '{s} 염색 공방 쪽염색'),
    desc: t5('昔ながらの藍がめで布を染める工房です。ハンカチかストールを、模様を考えながら自分で染めます。',
      'A workshop dyeing cloth in traditional indigo vats. Design and dye your own handkerchief or stole.',
      '用传统蓝染缸染布的工坊。自己设计图案，染一条手帕或围巾。',
      '用傳統藍染缸染布的工坊。自己設計圖案，染一條手帕或圍巾。',
      '전통 쪽물 항아리로 천을 물들이는 공방입니다. 무늬를 직접 정해 손수건이나 스톨을 염색합니다.'),
    pop: t5('藍染めハンカチ', 'Indigo handkerchief', '蓝染手帕', '藍染手帕', '쪽염색 손수건'), popPrice: 3000,
    kod: t5('藍は毎日かき混ぜ、機嫌を見ながら育てています。', 'We stir the indigo every day and tend it like a living thing.', '每天搅拌蓝染液，像照顾生命一样照料它。', '每天攪拌藍染液，像照顧生命一樣照料它。', '쪽물은 매일 저어 주며 살아 있는 것처럼 돌봅니다.'),
  },
  {
    category: 'experience', band: '1000to3000', price: [2000, 3000], duration: 90, belong: t5('歩きやすい靴・帽子', 'Walking shoes and a hat', '好走的鞋、帽子', '好走的鞋、帽子', '편한 신발, 모자'),
    name: t5('{s}農園 収穫体験', '{s} Farm Harvest Experience', '{s}农园 采摘体验', '{s}農園 採摘體驗', '{s} 농원 수확 체험'),
    desc: t5('家族で営む農園です。季節の野菜や果物を一緒に収穫し、畑のそばでそのまま味わいます。',
      'A family farm. Harvest seasonal vegetables or fruit with us and taste them right by the field.',
      '家族经营的农园。和我们一起采摘当季蔬果，在田边直接品尝。',
      '家族經營的農園。和我們一起採摘當季蔬果，在田邊直接品嚐。',
      '가족이 운영하는 농원입니다. 제철 채소나 과일을 함께 수확해 밭 옆에서 바로 맛봅니다.'),
    pop: t5('朝採り野菜セット', 'Morning-picked vegetables', '清晨采摘蔬菜组合', '清晨採摘蔬菜組合', '아침 수확 채소 세트'), popPrice: 800,
    kod: t5('農薬をできるだけ使わず、土づくりから手をかけています。', 'We use as few pesticides as possible and care for the soil ourselves.', '尽量不用农药，从培育土壤开始用心照料。', '盡量不用農藥，從培育土壤開始用心照料。', '농약은 최소한으로 쓰고, 흙 만들기부터 정성을 들입니다.'),
  },
  {
    category: 'experience', band: '1000to3000', price: [2000, 2500], duration: 60, belong: t5('特になし', 'Nothing special', '无', '無', '특별히 없음'),
    name: t5('{s}書道教室', '{s} Calligraphy Class', '{s}书道教室', '{s}書道教室', '{s} 서예 교실'),
    desc: t5('近所の子どもたちも通う書道教室です。筆の持ち方から教え、好きな漢字一文字を色紙に書いて持ち帰れます。',
      'A calligraphy class that local kids attend too. Learn to hold the brush and write a kanji of your choice on a card to take home.',
      '当地孩子们也会来上的书道教室。从握笔开始教，把喜欢的一个汉字写在色纸上带回家。',
      '在地孩子們也會來上的書道教室。從握筆開始教，把喜歡的一個漢字寫在色紙上帶回家。',
      '동네 아이들도 다니는 서예 교실입니다. 붓 잡는 법부터 배우고, 좋아하는 한자 한 글자를 색지에 써서 가져갑니다.'),
    pop: t5('一文字色紙', 'One-character art card', '单字色纸', '單字色紙', '한 글자 색지'), popPrice: 2000,
    kod: t5('墨は毎回すずりで磨り、香りも楽しんでもらいます。', 'We grind fresh ink on the inkstone each time, so you can enjoy its scent.', '每次都在砚台上现磨墨，也请享受墨香。', '每次都在硯台上現磨墨，也請享受墨香。', '먹은 매번 벼루에 갈아 그 향도 즐길 수 있게 합니다.'),
  },
  {
    category: 'experience', band: '3000to5000', price: [3500, 4500], duration: 120, belong: t5('エプロン', 'Apron', '围裙', '圍裙', '앞치마'),
    name: t5('{s}そば打ち処', '{s} Soba Making', '{s}荞麦面手作坊', '{s}蕎麥麵手作坊', '{s} 소바 만들기'),
    desc: t5('地元のそば粉で手打ちそばを作ります。こねる・のばす・切るまで体験し、最後に自分で打ったそばを食べます。',
      'Make hand-cut soba from local buckwheat flour — knead, roll and cut — then eat the noodles you made.',
      '用当地荞麦粉手工制作荞麦面，从揉面、擀面到切面全程体验，最后品尝自己做的面。',
      '用在地蕎麥粉手工製作蕎麥麵，從揉麵、擀麵到切麵全程體驗，最後品嚐自己做的麵。',
      '지역 메밀가루로 수타 소바를 만듭니다. 반죽하고 밀고 썰기까지 체험한 뒤 직접 만든 소바를 먹습니다.'),
    pop: t5('打ちたてざるそば', 'Fresh zaru soba', '现做笼屉荞麦面', '現做籠屜蕎麥麵', '갓 만든 자루소바'), popPrice: 900,
    kod: t5('そば粉はその日の朝に石臼で挽いています。', 'We stone-mill the buckwheat every morning.', '荞麦粉每天早上用石磨现磨。', '蕎麥粉每天早上用石磨現磨。', '메밀가루는 그날 아침 맷돌로 갑니다.'),
  },
  {
    category: 'restaurant', band: '1000to3000', menu: 'alacarte',
    name: t5('{s}食堂', '{s} Shokudo Diner', '{s}食堂', '{s}食堂', '{s} 식당'),
    desc: t5('近所の人が毎日お昼を食べに来る食堂です。日替わりの定食と、昔から変わらない味のおかずがそろっています。',
      'A neighborhood diner where locals have lunch every day — daily set meals and side dishes that have tasted the same for years.',
      '附近居民每天来吃午饭的食堂。有每日套餐，以及多年不变的家常小菜。',
      '附近居民每天來吃午飯的食堂。有每日套餐，以及多年不變的家常小菜。',
      '동네 사람들이 매일 점심을 먹으러 오는 식당입니다. 매일 바뀌는 정식과 오랫동안 변하지 않은 반찬이 있습니다.'),
    pop: t5('日替わり定食', 'Daily set meal', '每日套餐', '每日套餐', '오늘의 정식'), popPrice: 900,
    kod: t5('出汁は毎朝昆布とかつお節からとっています。', 'We make our dashi stock from kombu and bonito every morning.', '每天早上用昆布和鲣鱼片熬高汤。', '每天早上用昆布和柴魚片熬高湯。', '육수는 매일 아침 다시마와 가쓰오부시로 냅니다.'),
  },
  {
    category: 'restaurant', band: '3000to5000', menu: 'alacarte',
    name: t5('居酒屋 {s}', '{s} Izakaya', '居酒屋 {s}', '居酒屋 {s}', '이자카야 {s}'),
    desc: t5('仕事帰りの常連さんでにぎわう小さな居酒屋です。地元の魚と野菜を使ったおつまみと、近くの蔵のお酒があります。',
      'A small izakaya busy with regulars after work, serving small plates of local fish and vegetables with sake from a nearby brewery.',
      '下班后常客聚集的小居酒屋。有用当地鱼和蔬菜做的下酒菜，以及附近酒窖的酒。',
      '下班後常客聚集的小居酒屋。有用在地魚和蔬菜做的下酒菜，以及附近酒窖的酒。',
      '퇴근길 단골들로 북적이는 작은 이자카야입니다. 지역 생선과 채소로 만든 안주와 근처 양조장의 술이 있습니다.'),
    pop: t5('地魚の刺身盛り', 'Local sashimi platter', '当地鱼刺身拼盘', '在地魚生魚片拼盤', '지역 생선회 모둠'), popPrice: 1500,
    kod: t5('魚は毎朝、港で自分の目で選んでいます。', 'I pick the fish myself at the harbor every morning.', '每天早上亲自到港口挑选鲜鱼。', '每天早上親自到港口挑選鮮魚。', '생선은 매일 아침 항구에서 직접 고릅니다.'),
  },
  {
    category: 'restaurant', band: 'lt1000', menu: 'alacarte',
    name: t5('{s}うどん', '{s} Udon', '{s}乌冬面', '{s}烏龍麵', '{s} 우동'),
    desc: t5('地元の人が朝から通う手打ちうどんの店です。セルフ式で、天ぷらを好きなだけ選べます。',
      'A hand-made udon shop locals visit from the morning. Self-service — pick as much tempura as you like.',
      '当地人一早就来的手工乌冬面店。自助式，天妇罗随意挑选。',
      '在地人一早就來的手工烏龍麵店。自助式，天婦羅隨意挑選。',
      '동네 사람들이 아침부터 찾는 수타 우동집입니다. 셀프 방식이라 튀김을 마음대로 고를 수 있습니다.'),
    pop: t5('かけうどん', 'Kake udon', '清汤乌冬面', '清湯烏龍麵', '가케 우동'), popPrice: 400,
    kod: t5('麺は毎朝その日の気温に合わせて打っています。', 'We make the noodles every morning, adjusting to the day’s temperature.', '每天早上根据气温调整做面。', '每天早上根據氣溫調整做麵。', '면은 매일 아침 그날 기온에 맞춰 만듭니다.'),
  },
  {
    category: 'restaurant', band: '5000to10000', menu: 'course',
    name: t5('鮨 {s}', 'Sushi {s}', '寿司 {s}', '壽司 {s}', '스시 {s}'),
    desc: t5('カウンター8席の小さな寿司屋です。地元のお客さんが多く、その日の魚でおまかせを握ります。',
      'A small sushi bar with eight counter seats, mostly local guests. The chef makes an omakase course from the day’s fish.',
      '只有8个吧台座位的小寿司店，客人多为当地人。厨师用当天的鱼制作主厨套餐。',
      '只有8個吧台座位的小壽司店，客人多為在地人。師傅用當天的魚製作主廚套餐。',
      '카운터 8석의 작은 스시집으로 지역 손님이 많습니다. 그날의 생선으로 오마카세를 쥡니다.'),
    pop: t5('おまかせ握り', 'Omakase nigiri', '主厨精选握寿司', '主廚精選握壽司', '오마카세 니기리'), popPrice: 6000,
    kod: t5('酢飯は赤酢を使い、魚に合わせて温度を変えています。', 'We season the rice with red vinegar and adjust its temperature to each fish.', '寿司饭使用红醋，并根据鱼调整温度。', '壽司飯使用紅醋，並根據魚調整溫度。', '초밥 밥은 아카즈를 쓰고, 생선에 맞춰 온도를 바꿉니다.'),
  },
  {
    category: 'restaurant', band: 'lt1000', menu: 'alacarte',
    name: t5('喫茶 {s}', '{s} Kissaten Café', '{s}喫茶店', '{s}喫茶店', '{s} 킷사텐'),
    desc: t5('50年近く続く町の喫茶店です。常連さんが新聞を読みながらモーニングを食べる、ゆったりした店です。',
      'A town café running for nearly 50 years. A relaxed spot where regulars read the paper over a morning set.',
      '营业近50年的街头咖啡馆。常客边看报纸边吃早餐，氛围悠闲。',
      '營業近50年的街頭咖啡館。常客邊看報紙邊吃早餐，氣氛悠閒。',
      '50년 가까이 이어 온 동네 찻집입니다. 단골들이 신문을 보며 모닝 세트를 먹는 느긋한 가게입니다.'),
    pop: t5('モーニングセット', 'Morning set', '早餐套餐', '早餐套餐', '모닝 세트'), popPrice: 600,
    kod: t5('コーヒー豆は店で少しずつ焙煎しています。', 'We roast our coffee beans in small batches in the shop.', '咖啡豆在店里少量烘焙。', '咖啡豆在店裡少量烘焙。', '커피콩은 가게에서 조금씩 볶습니다.'),
  },
  {
    category: 'restaurant', band: '3000to5000', menu: 'alacarte',
    name: t5('焼鳥 {s}', 'Yakitori {s}', '烤鸡串 {s}', '烤雞串 {s}', '야키토리 {s}'),
    desc: t5('炭火で焼く焼き鳥の店です。近所の人が一杯飲みに立ち寄る、カウンター中心の店です。',
      'A charcoal-grilled yakitori shop with mostly counter seats, where neighbors drop in for a drink.',
      '炭火烤鸡串店，以吧台座位为主，附近居民常来喝一杯。',
      '炭火烤雞串店，以吧台座位為主，附近居民常來喝一杯。',
      '숯불로 굽는 야키토리집으로, 동네 사람들이 한잔하러 들르는 카운터 중심의 가게입니다.'),
    pop: t5('つくね', 'Tsukune meatball skewer', '鸡肉丸串', '雞肉丸串', '쓰쿠네'), popPrice: 250,
    kod: t5('鶏は地元の養鶏場から毎日届きます。', 'Our chicken comes fresh every day from a local farm.', '鸡肉每天从当地养鸡场送来。', '雞肉每天從在地養雞場送來。', '닭은 매일 지역 양계장에서 들어옵니다.'),
  },
  {
    category: 'restaurant', band: 'lt1000', menu: 'alacarte',
    name: t5('中華そば {s}', '{s} Chuka Soba Ramen', '中华面 {s}', '中華麵 {s}', '주카소바 {s}'),
    desc: t5('昔ながらの醤油ラーメンの店です。昼どきは近くで働く人で満席になります。',
      'An old-style soy-sauce ramen shop that fills up with nearby workers at lunchtime.',
      '传统酱油拉面店，午餐时间坐满附近上班族。',
      '傳統醬油拉麵店，午餐時間坐滿附近上班族。',
      '옛날식 간장 라멘집으로, 점심때는 근처 직장인들로 가득 찹니다.'),
    pop: t5('中華そば', 'Chuka soba', '中华面', '中華麵', '주카소바'), popPrice: 750,
    kod: t5('スープは鶏ガラと煮干しで毎日仕込みます。', 'We make the broth from chicken bones and dried sardines every day.', '汤头每天用鸡骨和小鱼干熬制。', '湯頭每天用雞骨和小魚乾熬製。', '국물은 매일 닭뼈와 멸치로 우립니다.'),
  },
  {
    category: 'restaurant', band: '1000to3000', menu: 'both',
    name: t5('郷土料理 {s}', '{s} Local Cuisine', '乡土料理 {s}', '鄉土料理 {s}', '향토 요리 {s}'),
    desc: t5('この土地の家庭料理を出す小さな店です。地元の人が法事やお祝いにも使います。',
      'A small restaurant serving the home cooking of this region, also used by locals for family gatherings.',
      '供应当地家常菜的小店，当地人也会在家庭聚会时光顾。',
      '供應在地家常菜的小店，在地人也會在家庭聚會時光顧。',
      '이 지역의 가정 요리를 내는 작은 가게로, 동네 사람들이 집안 모임에도 이용합니다.'),
    pop: t5('郷土料理の御膳', 'Local specialty set', '乡土料理套餐', '鄉土料理套餐', '향토 요리 정식'), popPrice: 2200,
    kod: t5('野菜は近所の畑から、その日の朝に届きます。', 'Vegetables arrive from nearby fields every morning.', '蔬菜每天早上从附近的田里送来。', '蔬菜每天早上從附近的田裡送來。', '채소는 매일 아침 근처 밭에서 옵니다.'),
  },
];
const PERKS = [
  null,
  t5('ドリンク1杯サービス', 'One free drink', '赠送一杯饮料', '贈送一杯飲料', '음료 한 잔 서비스'),
  t5('小鉢を一品サービス', 'A free small side dish', '赠送一道小菜', '贈送一道小菜', '작은 반찬 하나 서비스'),
  t5('お土産の小袋つき', 'A small gift to take home', '附赠小礼物', '附贈小禮物', '작은 기념품 증정'),
  null,
];

// 都道府県ごとに市から選ぶ（全国にまんべんなく）。どの都道府県にも同じ数を配り、余りは旅行者の多い都道府県に足す
const POPULAR = ['13', '27', '26', '01', '14', '23', '40', '47', '29', '28', '22', '34', '17', '20', '04', '43', '42', '46'];
function chooseCities(n) {
  const base = Math.floor(n / PREFS.length);
  const extra = new Set(POPULAR.slice(0, n - base * PREFS.length));
  const out = [];
  for (const p of PREFS) {
    const list = cities.filter((c) => c.pref === p.code && c.ja.endsWith('市'));
    const pool = list.length ? list : cities.filter((c) => c.pref === p.code);
    const count = base + (extra.has(p.code) ? 1 : 0);
    for (let i = 0; i < count; i++) out.push(pool[Math.floor(rand() * pool.length)]);
  }
  return out;
}

const strip = (name) => name.replace(/(市|区|町|村)$/, '');
const cityTexts = (c, pref) => ({
  ja: { city: c.ja, pref: pref.ja, station: `${strip(c.ja)}駅` },
  en: { city: c.en.replace(/ (Town|Village)$/, ''), pref: pref.en, station: `${c.en.replace(/ (Town|Village)$/, '')} Station` },
  zh: { city: c.ja, pref: pref.zh, station: `${strip(c.ja)}站` },
  zt: { city: c.ja, pref: pref.zt, station: `${strip(c.ja)}站` },
  ko: { city: c.ko, pref: pref.ko, station: `${c.ko.replace(/(시|구|정|촌)$/, '')}역` },
});
const address = (lang, ct, n) =>
  lang === 'ja' ? `${ct.pref}${ct.city}${n}` : lang === 'en' ? `${n}, ${ct.city}, ${ct.pref}` : lang === 'ko' ? `${ct.pref} ${ct.city} ${n}` : `${ct.pref}${ct.city}${n}`;

async function main() {
  console.log(`demo スキーマの中身を消して、架空の店を ${COUNT} 店入れます`);
  for (const table of ['PlaceView', 'Report', 'Message', 'Thread', 'Booking', 'Closure', 'Place', 'PasswordReset', 'Session', 'Throttle', 'User']) {
    await prisma.$executeRawUnsafe(`TRUNCATE "demo"."${table}" CASCADE`);
  }
  const passwordHash = await hashPassword(process.env.DEMO_PASSWORD);
  const chosen = chooseCities(COUNT);
  const now = Date.now();
  for (let i = 0; i < chosen.length; i++) {
    const c = chosen[i];
    const pref = PREFS.find((p) => p.code === c.pref);
    const k = pick(KINDS);
    const s = pick(SURNAMES);
    const perk = pick(PERKS);
    const ct = cityTexts(c, pref);
    const no = `${between(1, 9)}-${between(1, 30)}-${between(1, 20)}`;
    const text = (lang) => ({
      name: k.name[lang].replace('{s}', s[lang]),
      address: address(lang, ct[lang], no),
      station: ct[lang].station,
      description: k.desc[lang],
      belongings: k.belong?.[lang] ?? '',
      kodawari: k.kod[lang],
      perk: perk?.[lang] ?? '',
      popularName: k.pop[lang],
      popularNote: '',
      pickName: '',
      pickNote: '',
    });
    const ja = text('ja');
    const exp = k.category === 'experience';
    const capacity = exp ? between(4, 8) : between(6, 12);
    const slots = exp
      ? [{ time: '10:00', end: `${10 + Math.ceil(k.duration / 60)}:00`.padStart(5, '0'), capacity }, { time: '14:00', end: `${14 + Math.ceil(k.duration / 60)}:00`, capacity }]
      : [{ time: '17:30', end: '19:30', capacity }, { time: '19:30', end: '21:30', capacity }];
    const owner = await prisma.user.create({
      data: { role: 'BUSINESS', email: `demo-shop-${String(i + 1).padStart(3, '0')}@example.com`, passwordHash, name: `${s.ja}（デモ）`, termsAt: new Date() },
    });
    await prisma.place.create({
      data: {
        ownerId: owner.id,
        sample: true,
        published: true,
        publishedAt: new Date(now - i * 3600000),
        category: k.category,
        prefCode: c.pref,
        cityId: c.id,
        name: ja.name,
        address: ja.address,
        station: ja.station,
        stationKm: Math.round((0.2 + rand() * 4.8) * 10) / 10,
        lat: Math.round((c.lat + (rand() - 0.5) * 0.008) * 1e6) / 1e6,
        lng: Math.round((c.lng + (rand() - 0.5) * 0.008) * 1e6) / 1e6,
        description: ja.description,
        priceBand: k.band,
        price: exp ? between(k.price[0] / 100, k.price[1] / 100) * 100 : null,
        durationMin: exp ? k.duration : null,
        payment: pick(['cash', 'card']),
        localPct: pick([50, 60, 70, 70, 80, 80, 90, 90, 100]),
        years: pick(['gt30', 'gt30', '10to30', '10to30', 'lt10']),
        smoking: exp ? 'none' : pick(['none', 'none', 'separated', 'allowed']),
        pets: pick(['ok', 'no', 'no']),
        privateRoom: exp ? null : rand() < 0.4,
        popular: { name: ja.popularName, price: k.popPrice, note: '', photo: null },
        kodawari: ja.kodawari,
        perk: ja.perk,
        belongings: ja.belongings,
        minPeople: exp ? pick([1, 1, 2]) : null,
        dietSupport: exp ? [] : [pick(['vegetarian', 'allergy', 'gluten_free'])],
        menuStyle: k.menu ?? null,
        slots,
        closedWeekdays: [between(0, 6)],
        leadDays: pick([0, 1, 1, 2]),
        i18n: Object.fromEntries(['en', 'zh', 'zt', 'ko'].map((l) => [l, text(l)])),
        translatedAt: new Date(),
      },
    });
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1} 店`);
  }
  const byPref = await prisma.place.groupBy({ by: ['prefCode'], _count: true });
  console.log(`入れました：${chosen.length} 店（${byPref.length} 都道府県）`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
