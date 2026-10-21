// ジャンルの表示名（旅行者画面・事業者画面・キーワード検索で使う）
const v = (en, zh, zt, ko, ja) => ({ en, zh, zt, ko, ja });

export const GENRE_NAMES = {
  washoku: v('Japanese', '日料', '日式料理', '일식', '和食'),
  yoshoku: v('Western', '西餐', '西餐', '양식', '洋食'),
  chuka: v('Chinese', '中餐', '中式料理', '중식', '中華'),
  izakaya: v('Izakaya (Japanese pub)', '居酒屋（日式小酒馆）', '居酒屋（日式小酒館）', '이자카야 (일본식 선술집)', '居酒屋'),
  restaurant: v('Restaurant', '餐厅', '餐廳', '레스토랑', 'レストラン'),
  cafe: v('Café', '咖啡馆', '咖啡館', '카페', 'カフェ・喫茶'),
  sweets: v('Sweets', '甜品', '甜點', '디저트', '甘味・和菓子'),
  bar: v('Bar', '酒吧', '酒吧', '바', 'バー'),
  other_food: v('Other', '其他', '其他', '기타', 'その他の飲食店'),
  cooking: v('Cooking & food making', '料理・食物制作', '料理・食物製作', '요리・음식 만들기', '料理・食べ物づくり'),
  craft: v('Crafts', '手工艺', '手工藝', '공예', '工芸・ものづくり'),
  culture: v('Culture (tea, calligraphy…)', '文化（茶道・书法等）', '文化（茶道・書法等）', '문화 (다도・서예 등)', '文化（茶道・書道など）'),
  nature: v('Farming & nature', '农业・自然', '農業・自然', '농업・자연', '農業・自然'),
  other_exp: v('Other', '其他', '其他', '기타', 'その他の体験'),
};
