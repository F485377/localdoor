import { useEffect, useState } from 'react';
import { slotLabel } from '../../lib/domain.js';
import { Gloss } from '../glossary.jsx';
import { useI18n } from '../i18n/index.jsx';
import { useSession } from '../session.jsx';
import { paymentsText } from './bits.jsx';

// 予約したあとの「お店に行く前に」：お店への入り方・使える日本語・支払いとマナー。
// 予約が完了した画面と「予約の確認」に出す。お店の種類（飲食店・体験）と、お店の情報（支払方法・持ち物）に合わせる
const v = (en, zh, zt, ko, ja) => ({ en, zh, zt, ko, ja });
const TEXT = {
  title: v('Before you go', '出发前须知', '出發前須知', '가기 전에', 'お店に行く前に'),
  lead: v(
    'A few tips so your visit goes smoothly. Small local places really appreciate them.',
    '几个让到店更顺利的小提示。当地的小店会很感激。',
    '幾個讓到店更順利的小提示。在地的小店會很感謝。',
    '방문이 순조롭도록 알아 두면 좋은 팁이에요. 현지의 작은 가게들이 정말 고마워해요.',
    '気持ちよく過ごすためのちょっとしたコツです。地元の小さなお店ほど喜ばれます。',
  ),
  arrive: v('Arriving', '到店时', '到店時', '도착했을 때', 'お店に着いたら'),
  arrive1: v(
    'Arrive on time. If you will be late, send a message from the chat. Being more than 10–15 minutes late can mean the booking is cancelled.',
    '请准时到店。如果会迟到，请在聊天中告知。迟到10～15分钟以上可能会被取消。',
    '請準時到店。如果會遲到，請在聊天中告知。遲到10～15分鐘以上可能會被取消。',
    '시간에 맞춰 가요. 늦을 것 같으면 채팅으로 알려 주세요. 10~15분 이상 늦으면 예약이 취소될 수 있어요.',
    '時間どおりに行きましょう。遅れそうなときはチャットで連絡を。10〜15分以上遅れると、予約が取り消されることがあります。',
  ),
  arrive2: v(
    'Step inside, wait near the entrance, and tell the staff your name. You can also show the card below.',
    '进门后在门口稍等，告诉店员您的名字。也可以出示下面的卡片。',
    '進門後在門口稍等，告訴店員您的名字。也可以出示下面的卡片。',
    '안으로 들어가 입구에서 기다렸다가 이름을 말해 주세요. 아래 카드를 보여 줘도 돼요.',
    '入口で少し待ち、お店の人に名前を伝えます。下のカードを見せても大丈夫です。',
  ),
  showCard: v('Show this to the staff', '请出示给店员', '請出示給店員', '가게 분께 보여 주세요', 'お店の人に見せる'),
  phrases: v('Useful Japanese', '实用日语', '實用日語', '쓸 만한 일본어', '使える日本語'),
  inside: v('Inside', '店内', '店內', '가게 안에서', 'お店の中で'),
  pay: v('Paying', '付款', '付款', '결제', '支払い'),
  pay1: v('You pay at the place, in Japanese yen. Accepted here: {list}.', '在店内用日元付款。这家店可用：{list}。', '在店內以日圓付款。這家店可用：{list}。', '현장에서 엔화로 결제해요. 이 가게에서 쓸 수 있는 것: {list}.', 'お店で日本円で払います。このお店で使えるもの：{list}。'),
  pay2: v('No tipping. Leaving money on the table can confuse the staff.', '不用给小费。把钱留在桌上反而会让店员困惑。', '不用給小費。把錢留在桌上反而會讓店員困惑。', '팁은 필요 없어요. 테이블에 돈을 두고 가면 오히려 당황할 수 있어요.', 'チップはいりません。テーブルにお金を置いていくと、かえって困らせてしまいます。'),
  pay3: v('At small places you usually pay at the register when you leave. Say "Okaikei onegaishimasu" to ask for the bill.', '小店通常离开时在收银台付款。要结账时说"Okaikei onegaishimasu"。', '小店通常離開時在櫃台付款。要結帳時說「Okaikei onegaishimasu」。', '작은 가게는 보통 나갈 때 계산대에서 계산해요. 계산할 때는 "오카이케 오네가이시마스"라고 해요.', '小さなお店では、帰るときにレジで払うことが多いです。'),
};
// 飲食店・体験ごとのマナー
const TIPS = {
  restaurant: [
    v('Wait to be shown to your seat. If there are tatami seats (zashiki), take your shoes off before stepping up.', '等店员带位。如果是榻榻米座位（座敷），上去前要脱鞋。', '等店員帶位。如果是榻榻米座位（座敷），上去前要脫鞋。', '자리로 안내해 줄 때까지 기다려요. 다다미 자리(자시키)라면 올라가기 전에 신발을 벗어요.', '席に案内されるまで待ちましょう。座敷のときは靴を脱いで上がります。'),
    v('At an izakaya, a small starter (otoshi) may be served and charged per person. It is normal, not a mistake.', '在居酒屋可能会端上小菜（お通し），按人数收费。这是正常的，不是弄错了。', '在居酒屋可能會端上小菜（お通し），按人數收費。這是正常的，不是弄錯了。', '이자카야에서는 기본 안주(오토시)가 나오고 1인당 요금이 붙을 수 있어요. 실수가 아니라 원래 그래요.', '居酒屋ではお通しが出て、1人分の料金がかかることがあります。'),
    v('Use the wet towel (oshibori) for your hands. Say "Itadakimasu" before eating and "Gochisousama deshita" after.', '用湿毛巾（おしぼり）擦手。吃之前说"Itadakimasu"，吃完说"Gochisousama deshita"。', '用濕毛巾（おしぼり）擦手。吃之前說「Itadakimasu」，吃完說「Gochisousama deshita」。', '물수건(오시보리)으로 손을 닦아요. 먹기 전에 "이타다키마스", 다 먹고 "고치소사마데시타"라고 해요.', 'おしぼりで手をふき、食べる前に「いただきます」、食べたら「ごちそうさまでした」。'),
    v('Ask before taking photos of other guests or the kitchen. Keep phone calls outside.', '拍其他客人或厨房前先询问。电话请到店外接。', '拍其他客人或廚房前先詢問。電話請到店外接。', '다른 손님이나 주방을 찍기 전에는 먼저 물어봐요. 통화는 가게 밖에서 해요.', 'ほかのお客さんや厨房を撮るときは一言聞いてから。電話は外で。'),
  ],
  experience: [
    v('Wear clothes that can get a little dirty, and bring what the host asks for.', '穿可以弄脏一点的衣服，带上店家要求的物品。', '穿可以弄髒一點的衣服，帶上店家要求的物品。', '조금 더러워져도 되는 옷을 입고, 가게에서 부탁한 것을 챙겨 가요.', '汚れてもよい服で、お店に頼まれた持ち物を持っていきましょう。'),
    v('Listen to the host’s explanation before you start. It is fine to use gestures or the translation chat to ask.', '开始前先听店家说明。用手势或翻译聊天来提问都没关系。', '開始前先聽店家說明。用手勢或翻譯聊天來提問都沒關係。', '시작하기 전에 설명을 잘 들어요. 몸짓이나 번역 채팅으로 물어봐도 괜찮아요.', '始める前に説明を聞きましょう。身ぶりや翻訳チャットで質問しても大丈夫です。'),
    v('In a home or on tatami, take your shoes off at the entrance and line them up.', '在住家或榻榻米上，要在门口脱鞋并摆好。', '在住家或榻榻米上，要在門口脫鞋並擺好。', '집이나 다다미 위에서는 입구에서 신발을 벗고 가지런히 놓아요.', '家の中や畳の上では、入口で靴を脱いでそろえます。'),
    v('Ask before taking photos of the workshop or the people there.', '拍工作室或里面的人之前先询问。', '拍工作室或裡面的人之前先詢問。', '공방이나 사람을 찍기 전에는 먼저 물어봐요.', '工房や人を撮るときは、一言聞いてから。'),
  ],
};
const BRING = v('What to bring: {x}', '需要携带：{x}', '需要攜帶：{x}', '준비물: {x}', '持ち物：{x}');
// 使える日本語：[日本語, 読み方, 意味]
const PHRASES = [
  ['予約した{name}です。', 'Yoyaku shita {name} desu.', v('I have a booking. My name is {name}.', '我有预约，我叫{name}。', '我有預約，我叫{name}。', '예약한 {name}입니다.', '予約した〇〇です。')],
  ['すみません。', 'Sumimasen.', v('Excuse me. (to call the staff)', '不好意思。（叫店员时）', '不好意思。（叫店員時）', '저기요. (직원을 부를 때)', '店員さんを呼ぶとき')],
  ['これをください。', 'Kore o kudasai.', v('This one, please. (point at the menu)', '请给我这个。（指着菜单）', '請給我這個。（指著菜單）', '이거 주세요. (메뉴를 가리키며)', 'メニューを指さして')],
  ['写真を撮ってもいいですか？', 'Shashin o totte mo ii desu ka?', v('May I take a photo?', '可以拍照吗？', '可以拍照嗎？', '사진 찍어도 될까요?', '撮る前に')],
  ['お会計お願いします。', 'Okaikei onegaishimasu.', v('The bill, please.', '请结账。', '請結帳。', '계산해 주세요.', '会計のとき')],
  ['ごちそうさまでした。', 'Gochisousama deshita.', v('Thank you for the meal.', '谢谢款待。', '謝謝招待。', '잘 먹었습니다.', '食べ終わったら')],
];

export default function Manners({ booking: b, defaultOpen = true }) {
  const { lang } = useI18n();
  const { user } = useSession();
  const [open, setOpen] = useState(defaultOpen);
  // 予約完了の画面の「お店に行く前にを読む」から来たら開く
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener('ld-open-manners', on);
    return () => window.removeEventListener('ld-open-manners', on);
  }, []);
  const p = b.place;
  const tr = (x, vars = {}) => Object.entries(vars).reduce((s, [k, val]) => s.replaceAll(`{${k}}`, val), x[lang] ?? x.en);
  const name = user?.name ?? '';
  const tips = TIPS[p.category === 'experience' ? 'experience' : 'restaurant'];
  const pays = paymentsText(p, lang);
  const [mo, d] = b.date.slice(5).split('-').map(Number);

  return (
    <section className="manners card" aria-label={tr(TEXT.title)}>
      <button type="button" className="manners-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <h2>{tr(TEXT.title)}</h2>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <>
          <p className="muted">{tr(TEXT.lead)}</p>

          <h3>{tr(TEXT.arrive)}</h3>
          <ul className="manners-list">
            <li>{tr(TEXT.arrive1)}</li>
            <li>{tr(TEXT.arrive2)}</li>
          </ul>
          {/* お店の人に見せるカード（日本語） */}
          <div className="show-card" lang="ja">
            <span className="show-card-label">{tr(TEXT.showCard)}</span>
            <p>
              予約した <b>{name || '　　'}</b> です。
              <br />
              {mo}月{d}日 {slotLabel({ time: b.time, end: b.endTime })}、{b.partySize}名で予約しています。
              <br />
              よろしくお願いします。
            </p>
          </div>

          <h3>{tr(TEXT.inside)}</h3>
          <ul className="manners-list">
            {tips.map((x, i) => (
              <li key={i}>
                <Gloss text={tr(x)} />
              </li>
            ))}
            {p.category === 'experience' && p.belongings && <li>{tr(BRING, { x: p.belongings })}</li>}
          </ul>

          <h3>{tr(TEXT.pay)}</h3>
          <ul className="manners-list">
            {pays && <li>{tr(TEXT.pay1, { list: pays })}</li>}
            <li>{tr(TEXT.pay2)}</li>
            <li>{tr(TEXT.pay3)}</li>
          </ul>

          <h3>{tr(TEXT.phrases)}</h3>
          <ul className="phrases">
            {PHRASES.map(([ja, romaji, meaning]) => (
              <li key={ja}>
                <b lang="ja">{ja.replace('{name}', name || '〇〇')}</b>
                <span className="romaji">{romaji.replace('{name}', name || '___')}</span>
                {lang !== 'ja' && <span className="muted small">{tr(meaning, { name: name || '___' })}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
