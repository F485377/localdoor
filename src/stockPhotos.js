// お店の写真がまだない店に出す「イメージ写真」（無料で使える写真。撮った人とライセンスは /credits に出す）
//   料理・体験の種類ごと（DishArt の kind と同じ名前）と、店先（ジャンルごと）に1〜2枚
export const STOCK = {
  "ramen": [
    "/photos/ramen-1.webp",
    "/photos/ramen-2.webp"
  ],
  "gyoza": [
    "/photos/gyoza-1.webp",
    "/photos/gyoza-2.webp"
  ],
  "udon": [
    "/photos/udon-1.webp",
    "/photos/udon-2.webp"
  ],
  "soba": [
    "/photos/soba-1.webp",
    "/photos/soba-2.webp"
  ],
  "tempura": [
    "/photos/tempura-1.webp",
    "/photos/tempura-2.webp"
  ],
  "sushi": [
    "/photos/sushi-1.webp",
    "/photos/sushi-2.webp"
  ],
  "sashimi": [
    "/photos/sashimi-1.webp",
    "/photos/sashimi-2.webp"
  ],
  "karaage": [
    "/photos/karaage-1.webp",
    "/photos/karaage-2.webp"
  ],
  "yakitori": [
    "/photos/yakitori-1.webp",
    "/photos/yakitori-2.webp"
  ],
  "sake": [
    "/photos/sake-1.webp",
    "/photos/sake-2.webp"
  ],
  "curry": [
    "/photos/curry-1.webp",
    "/photos/curry-2.webp"
  ],
  "coffee": [
    "/photos/coffee-1.webp",
    "/photos/coffee-2.webp"
  ],
  "pudding": [
    "/photos/pudding-1.webp",
    "/photos/pudding-2.webp"
  ],
  "pasta": [
    "/photos/pasta-1.webp",
    "/photos/pasta-2.webp"
  ],
  "teishoku": [
    "/photos/teishoku-1.webp",
    "/photos/teishoku-2.webp"
  ],
  "kobachi": [
    "/photos/kobachi-1.webp",
    "/photos/kobachi-2.webp"
  ],
  "matcha": [
    "/photos/matcha-1.webp",
    "/photos/matcha-2.webp"
  ],
  "wagashi": [
    "/photos/wagashi-1.webp",
    "/photos/wagashi-2.webp"
  ],
  "pottery": [
    "/photos/pottery-1.webp",
    "/photos/pottery-2.webp"
  ],
  "indigo": [
    "/photos/indigo-1.webp",
    "/photos/indigo-2.webp"
  ],
  "farm": [
    "/photos/farm-1.webp",
    "/photos/farm-2.webp"
  ],
  "calligraphy": [
    "/photos/calligraphy-1.webp",
    "/photos/calligraphy-2.webp"
  ],
  "front-izakaya": [
    "/photos/front-izakaya-1.webp",
    "/photos/front-izakaya-2.webp"
  ],
  "front-ramen": [
    "/photos/front-ramen-1.webp",
    "/photos/front-ramen-2.webp"
  ],
  "front-sushi": [
    "/photos/front-sushi-1.webp",
    "/photos/front-sushi-2.webp"
  ],
  "front-kissa": [
    "/photos/front-kissa-1.webp"
  ],
  "front-wagashi": [
    "/photos/front-wagashi-1.webp",
    "/photos/front-wagashi-2.webp"
  ],
  "front-soba": [
    "/photos/front-soba-1.webp",
    "/photos/front-soba-2.webp"
  ],
  "front-washoku": [
    "/photos/front-washoku-1.webp",
    "/photos/front-washoku-2.webp"
  ],
  "front-shokudo": [
    "/photos/front-shokudo-1.webp",
    "/photos/front-shokudo-2.webp"
  ],
  "front-pottery": [
    "/photos/front-pottery-1.webp"
  ],
  "front-tea": [
    "/photos/front-tea-1.webp",
    "/photos/front-tea-2.webp"
  ],
  "front-sakagura": [
    "/photos/front-sakagura-1.webp",
    "/photos/front-sakagura-2.webp"
  ],
  "front-farm": [
    "/photos/front-farm-1.webp",
    "/photos/front-farm-2.webp"
  ]
};

const pick = (list, seed) => (list?.length ? list[Math.abs(seed) % list.length] : null);
const hash = (s) => [...String(s ?? '')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);

// 料理・体験の写真
export const dishPhoto = (kind, seed = 0) => pick(STOCK[kind], seed);

// 店先の写真：店名 → ジャンル → カテゴリ の順で決める
const FRONT_OF_NAME = [
  [/鮨|寿司|すし/, 'front-sushi'],
  [/そば|蕎麦/, 'front-soba'],
  [/ラーメン|らーめん|中華そば|餃子/, 'front-ramen'],
  [/酒造|酒蔵/, 'front-sakagura'],
  [/茶園|茶房|茶屋|茶道/, 'front-tea'],
  [/菓子|甘味/, 'front-wagashi'],
  [/陶|窯|器/, 'front-pottery'],
  [/農園|牧場|果樹/, 'front-farm'],
  [/居酒屋|焼鳥|焼き鳥/, 'front-izakaya'],
  [/喫茶|珈琲|カフェ/, 'front-kissa'],
];
const FRONT_OF_GENRE = {
  washoku: 'front-washoku', yoshoku: 'front-kissa', chuka: 'front-ramen', izakaya: 'front-izakaya', restaurant: 'front-shokudo', cafe: 'front-kissa',
  sweets: 'front-wagashi', bar: 'front-izakaya', other_food: 'front-shokudo', cooking: 'front-washoku', craft: 'front-pottery', culture: 'front-tea', nature: 'front-farm', other_exp: 'front-tea',
};
export function frontPhoto(place) {
  const name = place?.nameJa ?? place?.name ?? '';
  const kind = FRONT_OF_NAME.find(([re]) => re.test(name))?.[1] ?? FRONT_OF_GENRE[place?.genre] ?? (place?.category === 'experience' ? 'front-tea' : 'front-shokudo');
  return pick(STOCK[kind], hash(place?.id));
}
