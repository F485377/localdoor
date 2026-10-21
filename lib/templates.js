// チャットの定型文。旅行者向け（旅行者の言語で出す）と、事業者向け（日本語で出す）。
// どの言語にも決まった訳があるので、定型文をそのまま送ったときは翻訳 API を使わずにこの訳で届ける
const t = (id, ja, en, zh, zt, ko) => ({ id, ja, en, zh, zt, ko });

export const TEMPLATES = {
  // 旅行者 → お店
  traveler: [
    t('alone', '一人でも行けますか？', 'Can I come alone?', '一个人也可以去吗？', '一個人也可以去嗎？', '혼자 가도 되나요?'),
    t('card', 'カードは使えますか？', 'Do you accept credit cards?', '可以刷卡吗？', '可以刷卡嗎？', '카드 결제가 되나요?'),
    t('veg', 'ベジタリアン向けのメニューはありますか？', 'Do you have vegetarian options?', '有素食的选择吗？', '有素食的選擇嗎？', '채식 메뉴가 있나요?'),
    t('bring', '何か持っていく物はありますか？', 'Do I need to bring anything?', '需要带什么东西吗？', '需要帶什麼東西嗎？', '챙겨 가야 할 것이 있나요?'),
    t('kids', '小さな子ども連れでも大丈夫ですか？', 'Is it OK to come with small children?', '可以带小孩去吗？', '可以帶小孩去嗎？', '어린아이와 함께 가도 괜찮나요?'),
    t('nojp', '日本語が話せなくても大丈夫ですか？', "Is it OK if I don't speak Japanese?", '不会说日语也没关系吗？', '不會說日語也沒關係嗎？', '일본어를 못해도 괜찮나요?'),
    t('late', '10分ほど遅れます。すみません。', "I'll be about 10 minutes late. Sorry!", '我会晚到10分钟左右，抱歉。', '我會晚到10分鐘左右，抱歉。', '10분 정도 늦을 것 같아요. 죄송합니다.'),
  ],
  // お店 → 旅行者
  business: [
    t('ok', 'はい、大丈夫です。お待ちしています。', "Yes, that's fine. We look forward to seeing you!", '没问题，我们期待您的光临。', '沒問題，我們期待您的光臨。', '네, 괜찮습니다. 기다리고 있겠습니다.'),
    t('thanks', 'お問い合わせありがとうございます。', 'Thank you for your message.', '感谢您的咨询。', '感謝您的詢問。', '문의해 주셔서 감사합니다.'),
    t('full', '申し訳ありません、その日は満席です。', "We're sorry, we're fully booked that day.", '非常抱歉，那天已经客满了。', '非常抱歉，那天已經客滿了。', '죄송합니다. 그날은 예약이 꽉 찼습니다.'),
    t('cash', 'お支払いは現金のみです。', 'We accept cash only.', '只接受现金付款。', '只接受現金付款。', '결제는 현금만 가능합니다.'),
    t('nothing', '特に持ち物はいりません。', "You don't need to bring anything.", '不需要带任何东西。', '不需要帶任何東西。', '따로 챙겨 오실 것은 없습니다.'),
    t('nojp', '日本語が話せなくても大丈夫です。', "It's fine even if you don't speak Japanese.", '不会说日语也没关系。', '不會說日語也沒關係。', '일본어를 못하셔도 괜찮습니다.'),
    t('safe', 'お気をつけてお越しください。', 'Have a safe trip to our place!', '路上请注意安全。', '路上請注意安全。', '조심해서 오세요.'),
  ],
};

export const templateOf = (side, id) => TEMPLATES[side]?.find((x) => x.id === id) ?? null;
