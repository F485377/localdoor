// キーワード検索の言いかえ。どれか一つで検索すると、同じグループのどの言葉が書かれたお店も出す
// （例：「ramen」で検索しても、日本語で「ラーメン」と書かれたお店が出る）。
// label はボタンに出す名前（言語ごと）。kind：food（食べ物）・experience（体験）
// genres：その言葉から推測するジャンル（例：お茶 → 文化（茶道など））
const k = (id, kind, label, aliases, genres = []) => ({ id, kind, label, aliases: [...new Set([...Object.values(label), ...aliases])], genres });
const v = (en, zh, zt, ko, ja) => ({ en, zh, zt, ko, ja });

export const KEYWORDS = [
  // 体験
  k('tea', 'experience', v('Tea ceremony', '茶道', '茶道', '다도', '茶道'), ['tea ceremony', 'tea', 'matcha', '抹茶', 'お茶', '茶会', '말차', '茶'], ['culture']),
  k('pottery', 'experience', v('Pottery', '陶艺', '陶藝', '도예', '陶芸'), ['ceramics', '陶器', '焼き物', '窯', '陶瓷'], ['craft']),
  k('wagashi', 'experience', v('Wagashi making', '和果子制作', '和菓子製作', '화과자 만들기', '和菓子づくり'), ['wagashi', '和菓子', 'japanese sweets', '和果子', '화과자'], ['cooking', 'sweets']),
  k('cooking', 'experience', v('Cooking class', '料理课', '料理課', '요리 교실', '料理教室'), ['cooking', '料理', '調理', '烹饪', '요리'], ['cooking']),
  k('calligraphy', 'experience', v('Calligraphy', '书法', '書法', '서예', '書道'), ['shodo', '習字', '筆'], ['culture']),
  k('kimono', 'experience', v('Kimono', '和服', '和服', '기모노', '着物'), ['yukata', '浴衣', '着付け'], ['culture']),
  k('dyeing', 'experience', v('Dyeing & weaving', '染织', '染織', '염색・직물', '染め物・織物'), ['dyeing', 'weaving', 'indigo', '藍染', '染め', '織り', '染', '織'], ['craft']),
  k('farm', 'experience', v('Farm & harvest', '农场・采摘', '農場・採摘', '농장・수확', '農園・収穫'), ['farm', 'harvest', '農園', '収穫', '畑', '果樹', '采摘'], ['nature']),
  k('sake', 'experience', v('Sake brewery', '酒藏', '酒藏', '사케 양조장', '酒蔵'), ['sake', 'brewery', '酒蔵', '酒造', '日本酒', '清酒', '사케'], ['culture']),
  // 食べ物
  k('ramen', 'food', v('Ramen', '拉面', '拉麵', '라멘', 'ラーメン'), ['ramen', 'ラーメン', '中華そば', '拉面', '拉麵'], ['chuka']),
  k('udon', 'food', v('Udon', '乌冬面', '烏龍麵', '우동', 'うどん'), ['udon', 'うどん', '饂飩']),
  k('soba', 'food', v('Soba', '荞麦面', '蕎麥麵', '소바', 'そば'), ['soba', 'そば', '蕎麦', '荞麦']),
  k('sushi', 'food', v('Sushi', '寿司', '壽司', '스시', '寿司'), ['sushi', 'すし', '鮨', '寿司', '초밥']),
  k('tempura', 'food', v('Tempura', '天妇罗', '天婦羅', '튀김', '天ぷら'), ['tempura', '天ぷら', '天婦羅', '덴푸라']),
  k('yakitori', 'food', v('Yakitori', '烤鸡串', '烤雞串', '야키토리', '焼き鳥'), ['yakitori', '焼鳥', '焼き鳥', '串', '꼬치']),
  k('okonomiyaki', 'food', v('Okonomiyaki', '大阪烧', '大阪燒', '오코노미야키', 'お好み焼き'), ['okonomiyaki', 'お好み焼', 'たこ焼き', 'takoyaki', '章鱼烧', '章魚燒', '타코야키']),
  k('sweets', 'food', v('Japanese sweets', '和果子', '和菓子', '화과자', '和菓子'), ['wagashi', '和菓子', '甘味', '団子', 'だんご', 'dango', '団子'], ['sweets']),
  k('coffee', 'food', v('Coffee', '咖啡', '咖啡', '커피', 'コーヒー'), ['coffee', 'café', 'cafe', '喫茶', 'カフェ', '珈琲', '咖啡'], ['cafe']),
  k('izakaya', 'food', v('Izakaya', '居酒屋', '居酒屋', '이자카야', '居酒屋'), ['izakaya', '居酒屋', '酒場', 'pub', '이자카야'], ['izakaya']),
];

const norm = (s) => String(s ?? '').normalize('NFKC').toLowerCase().trim();

// 体験・飲食店を表す言葉（「お茶体験」の「体験」など）
const CATEGORY_WORDS = {
  experience: ['体験', '教室', 'ワークショップ', '見学', '作り', 'づくり', 'experience', 'workshop', 'class', 'lesson', 'tour', '体验', '體驗', '课', '課', '체험', '교실', '클래스'],
  restaurant: ['ごはん', 'ご飯', '食事', 'グルメ', 'ランチ', 'ディナー', 'restaurant', 'food', 'lunch', 'dinner', 'eat', '餐厅', '餐廳', '美食', '吃饭', '吃飯', '맛집', '식당', '음식'],
};
// 文化・工芸などの、ジャンルを表す言葉
const GENRE_WORDS = {
  culture: ['文化', '伝統', 'culture', 'traditional', '传统', '傳統', '문화', '전통'],
  craft: ['工芸', 'ものづくり', '工房', 'craft', 'handmade', '手工', '공예'],
  nature: ['自然', '農業', 'nature', 'farming', '农业', '農業', '자연', '농업'],
  cooking: ['料理', 'cooking', '烹饪', '요리'],
};

// 検索語1つの読み方：{ terms（本文に含まれていればよい言葉）, genres（このジャンルならよい）, category（体験・飲食店） }。
// 「お茶体験」のように言葉がつながっていても、知っている言葉を探して分けて読む
export function interpretWord(word) {
  const w = norm(word);
  const exact = KEYWORDS.find((g) => g.aliases.some((a) => norm(a) === w));
  if (exact) return { terms: [...new Set([w, ...exact.aliases.map(norm)])], genres: exact.genres, category: null };
  const terms = new Set();
  const genres = new Set();
  let category = null;
  let rest = w;
  // 長い言葉から先に探す（「和菓子づくり」を「和菓子」より先に）
  const found = KEYWORDS.flatMap((g) => g.aliases.map((a) => [norm(a), g]))
    .filter(([a]) => a.length >= 2)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [a, g] of found) {
    if (!rest.includes(a)) continue;
    g.aliases.forEach((x) => terms.add(norm(x)));
    g.genres.forEach((x) => genres.add(x));
    rest = rest.replaceAll(a, ' ');
  }
  for (const [cat, list] of Object.entries(CATEGORY_WORDS)) {
    const hit = list.map(norm).find((x) => rest.includes(x));
    if (hit) {
      category = cat;
      rest = rest.replaceAll(hit, ' ');
    }
  }
  for (const [genre, list] of Object.entries(GENRE_WORDS)) {
    const hit = list.map(norm).find((x) => rest.includes(x));
    if (hit) {
      genres.add(genre);
      list.forEach((x) => terms.add(norm(x)));
      rest = rest.replaceAll(hit, ' ');
    }
  }
  // 分からなかった残りは、そのまま本文から探す
  const leftover = rest.replace(/\s+/g, ' ').trim();
  if (leftover && leftover.length >= 2 && !terms.size && !genres.size) terms.add(leftover);
  if (!terms.size && !genres.size && !category) terms.add(w);
  return { terms: [...terms], genres: [...genres], category };
}

// 検索語1つを、言いかえも含めた語のリストにする
export function expandWord(word) {
  const w = norm(word);
  const group = KEYWORDS.find((g) => g.aliases.some((a) => norm(a) === w));
  return group ? [...new Set([w, ...group.aliases.map(norm)])] : [w];
}

// ボタンに出すキーワード（言語ごとの名前）
export const keywordChips = (lang, kind) => KEYWORDS.filter((g) => !kind || g.kind === kind).map((g) => ({ id: g.id, kind: g.kind, label: g.label[lang] ?? g.label.en }));
