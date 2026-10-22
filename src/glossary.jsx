import { Fragment, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from './i18n/index.jsx';
import { Sheet } from './ui.jsx';

// 用語集：お通し・小鉢など、英語に訳しにくい日本ならではの言葉。お店の説明やメニュー、口コミの中に出てきたら青字にして、
// マウスをかざすと（スマホはタップすると）意味を出す。
// match は文章の中で探す書き方（日本語・ローマ字・各言語の書き方）。大文字小文字は区別しない
const v = (en, zh, zt, ko, ja) => ({ en, zh, zt, ko, ja });
const TERMS = [
  {
    id: 'kobachi',
    match: ['小鉢', 'kobachi', '小碟'],
    title: v('Kobachi', '小钵（小鉢）', '小缽（小鉢）', '고바치 (작은 반찬)', '小鉢'),
    meaning: v('A small side dish in a little bowl, such as simmered vegetables or pickles. Set meals often come with one or two.', '装在小碗里的小菜，例如炖菜或腌菜。套餐常附一两道。', '裝在小碗裡的小菜，例如燉菜或醃菜。套餐常附一兩道。', '조림이나 절임 같은 작은 그릇에 담긴 반찬이에요. 정식에는 보통 한두 개가 나와요.', '小さな器に入ったおかず。煮物や漬物など。定食によく付く。'),
  },
  {
    id: 'ippin',
    match: ['一品料理', 'ippin ryori'],
    title: v('Ippin ryori', '单点菜（一品料理）', '單點菜（一品料理）', '잇핀 요리 (단품 요리)', '一品料理'),
    meaning: v('Dishes ordered one by one, not as a set. Common at izakaya, where everyone shares.', '一道一道单独点的菜，不是套餐。居酒屋常见，大家一起分享。', '一道一道單獨點的菜，不是套餐。居酒屋常見，大家一起分享。', '세트가 아니라 하나씩 주문하는 요리예요. 이자카야에서 흔하고 다 같이 나눠 먹어요.', 'セットではなく一皿ずつ頼む料理。居酒屋でよく見かけ、みんなで分ける。'),
  },
  {
    id: 'omori',
    match: ['大盛り', '大盛', 'oomori', 'omori'],
    title: v('Omori', '大份（大盛り）', '大份（大盛り）', '오모리 (곱빼기)', '大盛り'),
    meaning: v('A large serving, usually of rice or noodles, for a small extra charge (sometimes free).', '大份，通常是米饭或面，加少许钱（有时免费）。', '大份，通常是白飯或麵，加少許錢（有時免費）。', '밥이나 면을 많이 담는 것으로, 약간의 추가 요금이 붙어요(무료인 곳도 있어요).', 'ごはんや麺を多めに盛ること。少し値段が上がる（無料の店も）。'),
  },
  {
    id: 'kaedama',
    match: ['替え玉', 'kaedama'],
    title: v('Kaedama', '加面（替え玉）', '加麵（替え玉）', '가에다마 (면 추가)', '替え玉'),
    meaning: v('An extra serving of noodles added to your leftover ramen soup. Order it before the soup gets cold.', '在剩下的拉面汤里再加一份面。趁汤还热时点。', '在剩下的拉麵湯裡再加一份麵。趁湯還熱時點。', '남은 라멘 국물에 면만 추가하는 것이에요. 국물이 식기 전에 주문해요.', 'ラーメンのスープを残したまま、麺だけをおかわりすること。'),
  },
  {
    id: 'okawari',
    match: ['おかわり', 'お代わり', 'okawari'],
    title: v('Okawari', '续（おかわり）', '續（おかわり）', '오카와리 (리필)', 'おかわり'),
    meaning: v('A second serving or refill, often of rice or drinks. Some places offer free rice refills.', '再来一份或续杯，常指米饭或饮料。有些店米饭免费续。', '再來一份或續杯，常指白飯或飲料。有些店白飯免費續。', '밥이나 음료를 한 번 더 받는 것이에요. 밥 리필이 무료인 곳도 있어요.', '同じものをもう一杯頼むこと。ごはんのおかわり無料の店も。'),
  },
  {
    id: 'tachinomi',
    match: ['立ち飲み', 'tachinomi'],
    title: v('Tachinomi', '站着喝的小酒馆（立ち飲み）', '站著喝的小酒館（立ち飲み）', '다치노미 (서서 마시는 술집)', '立ち飲み'),
    meaning: v('A standing bar with no seats. Cheap, quick and a good place to chat with locals.', '没有座位、站着喝的小酒馆。便宜快捷，容易和当地人聊天。', '沒有座位、站著喝的小酒館。便宜快速，容易和在地人聊天。', '의자 없이 서서 마시는 술집이에요. 싸고 빠르며 현지인과 이야기하기 좋아요.', '席がなく立って飲むお店。安く気軽で、地元の人と話しやすい。'),
  },
  {
    id: 'noren',
    match: ['暖簾', 'のれん', 'noren'],
    title: v('Noren', '门帘（暖簾）', '門簾（暖簾）', '노렌 (가게 천막)', '暖簾'),
    meaning: v('The fabric curtain at a shop entrance. When it hangs outside, the shop is open.', '挂在店门口的布帘。挂出来就表示正在营业。', '掛在店門口的布簾。掛出來就表示正在營業。', '가게 입구에 거는 천이에요. 밖에 걸려 있으면 영업 중이라는 뜻이에요.', 'お店の入口にかける布。外に出ていれば営業中のしるし。'),
  },
  {
    id: 'okami',
    match: ['女将', 'okami'],
    title: v('Okami', '老板娘（女将）', '老闆娘（女将）', '오카미 (여주인)', '女将'),
    meaning: v('The landlady who runs a restaurant or inn and welcomes guests.', '经营料理店或旅馆、负责接待客人的女主人。', '經營料理店或旅館、負責接待客人的女主人。', '음식점이나 여관을 꾸리며 손님을 맞이하는 여주인이에요.', '料理屋や旅館を切り盛りし、お客さんを迎える女性の主人。'),
  },
  {
    id: 'taisho',
    match: ['大将', 'taisho'],
    title: v('Taisho', '老板（大将）', '老闆（大将）', '다이쇼 (주인장)', '大将'),
    meaning: v('A friendly way to call the owner-chef of a small restaurant, such as a sushi bar or izakaya.', '对寿司店、居酒屋等小店老板兼厨师的亲切称呼。', '對壽司店、居酒屋等小店老闆兼廚師的親切稱呼。', '초밥집이나 이자카야 같은 작은 가게의 주인 겸 요리사를 친근하게 부르는 말이에요.', '寿司屋や居酒屋などの店主（料理人）を親しみをこめて呼ぶ言い方。'),
  },
  {
    id: 'donburi',
    match: ['丼', 'donburi'],
    title: v('Donburi', '盖饭（丼）', '蓋飯（丼）', '돈부리 (덮밥)', '丼'),
    meaning: v('A bowl of rice with toppings, such as beef (gyudon) or pork cutlet (katsudon).', '在米饭上放配料的大碗饭，例如牛肉盖饭、猪排盖饭。', '在白飯上放配料的大碗飯，例如牛肉蓋飯、豬排蓋飯。', '밥 위에 고기나 돈가스 등을 올린 덮밥이에요.', 'ごはんの上におかずをのせた料理。牛丼・カツ丼など。'),
  },
  {
    id: 'gozen',
    match: ['御膳', 'gozen'],
    title: v('Gozen', '御膳（套餐）', '御膳（套餐）', '고젠 (상차림 세트)', '御膳'),
    meaning: v('A set of several dishes served together on a tray, often a little more formal than a teishoku.', '放在托盘上一起端上的多道菜套餐，通常比定食正式一些。', '放在托盤上一起端上的多道菜套餐，通常比定食正式一些。', '여러 요리를 쟁반에 함께 내는 상차림으로, 정식보다 조금 격식 있는 경우가 많아요.', '何品かの料理をお盆にのせて出すセット。定食より少し改まったもの。'),
  },
  {
    id: 'otsumami',
    match: ['おつまみ', '酒の肴', 'otsumami'],
    title: v('Otsumami', '下酒菜（おつまみ）', '下酒菜（おつまみ）', '오쓰마미 (안주)', 'おつまみ'),
    meaning: v('Small snacks or dishes eaten with drinks.', '配酒吃的小菜或零食。', '配酒吃的小菜或零食。', '술과 함께 먹는 작은 안주예요.', 'お酒と一緒に食べる軽い料理。'),
  },
  {
    id: 'tsukemono',
    match: ['漬物', 'お新香', 'tsukemono'],
    title: v('Tsukemono', '腌菜（漬物）', '醃菜（漬物）', '쓰케모노 (절임)', '漬物'),
    meaning: v('Japanese pickled vegetables, served in small amounts with rice.', '日式腌菜，少量配米饭吃。', '日式醃菜，少量配白飯吃。', '일본식 채소 절임으로, 밥과 함께 조금씩 나와요.', '野菜を塩やぬかで漬けたもの。ごはんと一緒に少し出る。'),
  },
  {
    id: 'obanzai',
    match: ['おばんざい', 'obanzai'],
    title: v('Obanzai', '京都家常菜（おばんざい）', '京都家常菜（おばんざい）', '오반자이 (교토 가정식)', 'おばんざい'),
    meaning: v('Kyoto-style home cooking: simple seasonal side dishes, often lined up on the counter.', '京都风味的家常菜：简单的时令小菜，常摆在吧台上。', '京都風味的家常菜：簡單的季節小菜，常擺在吧台上。', '교토식 가정 요리로, 제철 재료의 소박한 반찬이 카운터에 놓여 있는 경우가 많아요.', '京都の家庭のおかず。季節の素朴な料理がカウンターに並ぶことが多い。'),
  },
  {
    id: 'ohiya',
    match: ['お冷', 'おひや', 'ohiya'],
    title: v('Ohiya', '冰水（お冷）', '冰水（お冷）', '오히야 (찬물)', 'お冷'),
    meaning: v('Free cold water served at restaurants. You can ask for more.', '餐厅免费提供的冷水，可以再要。', '餐廳免費提供的冷水，可以再要。', '음식점에서 무료로 주는 찬물이에요. 더 달라고 해도 돼요.', 'お店で無料で出る冷たい水。おかわりもできる。'),
  },
  {
    id: 'kan',
    match: ['熱燗', 'お燗', 'atsukan'],
    title: v('Kan / Hiya', '温酒・冷酒（燗・冷や）', '溫酒・冷酒（燗・冷や）', '간・히야 (데운 술・찬 술)', '燗・冷や'),
    meaning: v('How sake is served: "kan" or "atsukan" is warmed, "hiya" is at room temperature or cold.', '日本酒的喝法："燗"是温热的，"冷や"是常温或冰的。', '日本酒的喝法：「燗」是溫熱的，「冷や」是常溫或冰的。', '사케를 마시는 방법: "간"은 데운 것, "히야"는 상온 또는 차게 한 것이에요.', '日本酒の飲み方。燗はあたためたもの、冷やは常温か冷たいもの。'),
  },
  {
    id: 'otoshi',
    match: ['お通し', '突き出し', 'otoshi', 'お通し代', '오토시'],
    title: v('Otoshi', '小菜（お通し）', '小菜（お通し）', '오토시', 'お通し'),
    meaning: v(
      'A small dish served automatically when you sit down at an izakaya. It is not free: a small charge (often ¥300–¥800 per person) is added to the bill, like a table charge.',
      '在居酒屋入座后自动端上的一小碟菜。不是免费的，会按人数加收少量费用（常见每人300～800日元），类似座位费。',
      '在居酒屋入座後自動端上的一小碟菜。不是免費的，會按人數加收少量費用（常見每人300～800日圓），類似座位費。',
      '이자카야에서 자리에 앉으면 자동으로 나오는 작은 안주예요. 무료가 아니며, 1인당 소액(보통 300~800엔)이 자릿세처럼 계산서에 더해져요.',
      '居酒屋で席に着くと最初に出てくる小さな料理。無料ではなく、席料のように1人あたり数百円が会計に入ります。',
    ),
  },
  {
    id: 'nomihodai',
    match: ['飲み放題', 'nomihodai', 'nomi-hodai', '노미호다이'],
    title: v('Nomihodai', '畅饮（飲み放題）', '暢飲（飲み放題）', '노미호다이 (무제한 음료)', '飲み放題'),
    meaning: v(
      'All-you-can-drink for a set price and time (usually 90–120 minutes). Often only with a set course.',
      '在规定时间内（通常90～120分钟）以固定价格无限畅饮。多数需要搭配套餐。',
      '在規定時間內（通常90～120分鐘）以固定價格無限暢飲。多數需要搭配套餐。',
      '정해진 시간(보통 90~120분) 동안 정액으로 음료를 마음껏 마실 수 있어요. 코스 요리와 함께인 경우가 많아요.',
      '決まった時間（多くは90〜120分）、決まった値段で飲み物を好きなだけ頼めること。コースとセットのことが多い。',
    ),
  },
  {
    id: 'zashiki',
    match: ['お座敷', '座敷', 'zashiki', '자시키'],
    title: v('Zashiki', '和式座席（座敷）', '和式座席（座敷）', '자시키 (좌식 자리)', '座敷'),
    meaning: v(
      'Seating on tatami mats at a low table. Take your shoes off before stepping up, and sit on cushions on the floor.',
      '铺着榻榻米、配矮桌的座位。上去之前要脱鞋，坐在地上的坐垫上。',
      '鋪著榻榻米、配矮桌的座位。上去之前要脫鞋，坐在地上的坐墊上。',
      '다다미 위에 낮은 상이 있는 좌석이에요. 올라가기 전에 신발을 벗고, 바닥의 방석에 앉아요.',
      '畳の上に低い机がある席。靴を脱いで上がり、床の座布団に座ります。',
    ),
  },
  {
    id: 'tatami',
    match: ['畳', 'tatami', '榻榻米', '다다미'],
    title: v('Tatami', '榻榻米', '榻榻米', '다다미', '畳'),
    meaning: v(
      'Traditional Japanese floor mats made of woven straw. Do not walk on them with shoes or slippers.',
      '用蔺草编织的日本传统地垫。不要穿鞋或拖鞋踩上去。',
      '用藺草編織的日本傳統地墊。不要穿鞋或拖鞋踩上去。',
      '짚을 엮어 만든 일본의 전통 바닥재예요. 신발이나 슬리퍼를 신고 올라가지 않아요.',
      'い草で編んだ日本の床。靴やスリッパのまま上がりません。',
    ),
  },
  {
    id: 'teishoku',
    match: ['定食', 'teishoku', '테이쇼쿠'],
    title: v('Teishoku', '套餐（定食）', '套餐（定食）', '테이쇼쿠 (정식)', '定食'),
    meaning: v(
      'A set meal: a main dish with rice, miso soup and small side dishes, all on one tray.',
      '一份套餐：主菜配米饭、味噌汤和小菜，放在同一个托盘里。',
      '一份套餐：主菜配白飯、味噌湯和小菜，放在同一個托盤裡。',
      '메인 요리에 밥, 된장국, 작은 반찬이 한 쟁반에 나오는 세트 메뉴예요.',
      'おかずにごはん・みそ汁・小鉢が付いたセットの食事。',
    ),
  },
  {
    id: 'omakase',
    match: ['おまかせ', 'お任せ', 'omakase', '오마카세'],
    title: v('Omakase', '主厨推荐（おまかせ）', '主廚推薦（おまかせ）', '오마카세', 'おまかせ'),
    meaning: v(
      'You leave the choice to the chef, who serves what is best that day. The price is often fixed in advance.',
      '交给厨师决定，由厨师端上当天最好的菜。价格通常事先固定。',
      '交給廚師決定，由廚師端上當天最好的菜。價格通常事先固定。',
      '요리사에게 맡기면 그날 가장 좋은 요리를 내줘요. 가격은 미리 정해져 있는 경우가 많아요.',
      '料理を店主に任せて、その日いちばん良いものを出してもらうこと。値段は先に決まっていることが多い。',
    ),
  },
  {
    id: 'kaiseki',
    match: ['懐石', '会席', 'kaiseki', '가이세키'],
    title: v('Kaiseki', '怀石料理', '懷石料理', '가이세키', '懐石・会席'),
    meaning: v(
      'A traditional multi-course Japanese meal with many small, seasonal dishes served one after another.',
      '传统的日式多道菜，按顺序端上许多小份的当季料理。',
      '傳統的日式多道菜，按順序端上許多小份的當季料理。',
      '제철 재료로 만든 작은 요리가 차례로 나오는 일본의 전통 코스 요리예요.',
      '季節の小さな料理が順番に出てくる、日本の伝統的なコース料理。',
    ),
  },
  {
    id: 'wagashi',
    match: ['和菓子', 'wagashi', '和果子', '화과자'],
    title: v('Wagashi', '和果子', '和菓子', '화과자', '和菓子'),
    meaning: v(
      'Traditional Japanese sweets, often made from rice flour and sweet bean paste, and shaped to show the season.',
      '日本传统点心，多用米粉和豆沙制作，造型会表现季节。',
      '日本傳統點心，多用米粉和豆沙製作，造型會表現季節。',
      '쌀가루나 팥소로 만드는 일본의 전통 과자로, 계절을 표현한 모양이 많아요.',
      '米粉やあんこで作る日本の伝統的なお菓子。季節を表す形が多い。',
    ),
  },
  {
    id: 'matcha',
    match: ['抹茶', 'matcha', '말차'],
    title: v('Matcha', '抹茶', '抹茶', '말차', '抹茶'),
    meaning: v(
      'Powdered green tea whisked with hot water. It is a little bitter and often served with a sweet.',
      '用热水搅拌的绿茶粉。略带苦味，常搭配点心。',
      '用熱水攪拌的綠茶粉。略帶苦味，常搭配點心。',
      '가루 녹차를 뜨거운 물에 저어 만든 차예요. 조금 쓰고, 과자와 함께 나오는 경우가 많아요.',
      '粉の緑茶をお湯で点てたもの。少し苦く、お菓子と一緒に出ることが多い。',
    ),
  },
  {
    id: 'nihonshu',
    match: ['日本酒', 'nihonshu', '清酒', '니혼슈'],
    title: v('Nihonshu (sake)', '日本酒', '日本酒', '니혼슈 (사케)', '日本酒'),
    meaning: v(
      'Japanese rice wine, usually called "sake" abroad. It can be served cold, at room temperature or warm.',
      '用大米酿造的日本酒，国外常称为 sake。可冷饮、常温或温热饮用。',
      '用米釀造的日本酒，國外常稱為 sake。可冷飲、常溫或溫熱飲用。',
      '쌀로 빚은 일본 술로, 해외에서는 보통 사케라고 불러요. 차게, 상온, 따뜻하게 마실 수 있어요.',
      '米から造るお酒。冷や・常温・燗（あたためる）で飲めます。',
    ),
  },
  {
    id: 'shochu',
    match: ['焼酎', 'shochu', '烧酒', '燒酒', '소주'],
    title: v('Shochu', '烧酎', '燒酎', '쇼추', '焼酎'),
    meaning: v(
      'A Japanese distilled spirit made from barley, sweet potato or rice. Often drunk with water, soda or on the rocks.',
      '用大麦、红薯或大米蒸馏的日本烈酒。常兑水、苏打或加冰饮用。',
      '用大麥、地瓜或米蒸餾的日本烈酒。常兌水、蘇打或加冰飲用。',
      '보리・고구마・쌀로 만드는 일본의 증류주예요. 물이나 탄산수에 타거나 얼음을 넣어 마셔요.',
      '麦・芋・米などから造る蒸留酒。水割り・ソーダ割り・ロックで飲むことが多い。',
    ),
  },
  {
    id: 'oshibori',
    match: ['おしぼり', 'oshibori', '물수건'],
    title: v('Oshibori', '湿毛巾（おしぼり）', '濕毛巾（おしぼり）', '오시보리 (물수건)', 'おしぼり'),
    meaning: v('A wet towel given to you before the meal to wipe your hands (not your face).', '饭前送上的湿毛巾，用来擦手（不要擦脸）。', '飯前送上的濕毛巾，用來擦手（不要擦臉）。', '식사 전에 손을 닦으라고 주는 물수건이에요(얼굴은 닦지 않아요).', '食事の前に出る、手をふくための濡れたタオル。'),
  },
  {
    id: 'izakaya',
    match: ['居酒屋', 'izakaya', '이자카야'],
    title: v('Izakaya', '居酒屋', '居酒屋', '이자카야', '居酒屋'),
    meaning: v(
      'A casual Japanese pub where you order many small dishes to share with drinks.',
      '日式小酒馆，边喝酒边点很多小菜一起分享。',
      '日式小酒館，邊喝酒邊點很多小菜一起分享。',
      '술과 함께 여러 가지 작은 요리를 시켜 나눠 먹는 일본식 선술집이에요.',
      'お酒と一緒に小皿の料理をいくつも頼んで分け合う、気軽なお店。',
    ),
  },
  {
    id: 'dashi',
    match: ['出汁', 'dashi'],
    title: v('Dashi', '高汤（出汁）', '高湯（出汁）', '다시 (육수)', '出汁'),
    meaning: v(
      'Japanese soup stock, usually made from kelp and dried bonito flakes (fish). Ask if you avoid fish.',
      '日式高汤，通常用昆布和柴鱼片（鱼）熬制。不吃鱼的话请先询问。',
      '日式高湯，通常用昆布和柴魚片（魚）熬製。不吃魚的話請先詢問。',
      '보통 다시마와 가쓰오부시(생선)로 낸 일본식 육수예요. 생선을 못 드시면 미리 물어보세요.',
      '昆布やかつお節でとるスープの素。魚を食べない人は確認を。',
    ),
  },
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ALL = TERMS.flatMap((term) => term.match.map((m) => [m.toLowerCase(), term])).sort((a, b) => b[0].length - a[0].length);
const PATTERN = new RegExp(`(${ALL.map(([m]) => esc(m)).join('|')})`, 'gi');
const termOf = (word) => ALL.find(([m]) => m === word.toLowerCase())?.[1];

// 文章の中の用語を青字のボタンにする。タップすると下から意味が出る
// かざしたときの吹き出しが画面の左右からはみ出さないように、出したあとで横にずらす
function fitTip(e) {
  const tip = e.currentTarget.querySelector('.gloss-tip');
  if (!tip) return;
  tip.style.setProperty('--tip-shift', '0px');
  requestAnimationFrame(() => {
    const r = tip.getBoundingClientRect();
    const pad = 8;
    const shift = r.left < pad ? pad - r.left : r.right > window.innerWidth - pad ? window.innerWidth - pad - r.right : 0;
    tip.style.setProperty('--tip-shift', `${Math.round(shift)}px`);
  });
}

export function Gloss({ text }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(null);
  if (!text) return null;
  const parts = String(text).split(PATTERN);
  return (
    <>
      {parts.map((part, i) => {
        const term = i % 2 === 1 ? termOf(part) : null;
        return term ? (
          <button key={i} type="button" className="gloss" onClick={() => setOpen(term)} onMouseEnter={fitTip} onFocus={fitTip} aria-haspopup="dialog" aria-describedby={`gloss-${term.id}`}>
            {part}
            {/* マウスをかざすと、その場で意味を出す（スマホはタップで下から出す） */}
            <span className="gloss-tip" role="tooltip" id={`gloss-${term.id}`}>
              <b>{term.title[lang] ?? term.title.en}</b>
              {term.meaning[lang] ?? term.meaning.en}
            </span>
          </button>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        );
      })}
      {/* 意味の画面は文章（<p>）の外に出す */}
      {open &&
        createPortal(
          <Sheet open onClose={() => setOpen(null)} title={open.title[lang] ?? open.title.en} closeLabel={t('close')}>
            <p style={{ marginTop: 0 }}>{open.meaning[lang] ?? open.meaning.en}</p>
            <p className="small muted">{t('gloss.note')}</p>
          </Sheet>,
          document.body,
        )}
    </>
  );
}
