// 旅のおともキャラクター「リュウ」（忍者）。フェルト人形のような立体の忍者（public/ninja/ の画像。動画から切り抜いたもの）
//   NinjaBody … 全身。pose：'sign'（手を合わせる。ゆっくりゆれる）｜'shuriken'（構える）｜'scroll'（手を合わせる・止まった絵）｜'jump'（跳んで出てくる）
//   NinjaFace … 丸い枠の顔（右下のボタン・会話の画面のアイコン）
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const BODY = {
  sign: () => (reduced() ? '/ninja/sign.webp' : '/ninja/sign-loop.webp'),
  scroll: () => '/ninja/sign.webp',
  shuriken: () => '/ninja/stance.webp',
  jump: () => '/ninja/jump.webp',
};

export function NinjaBody({ className = '', pose = 'sign' }) {
  return <img className={`ninja-img ${className}`} src={(BODY[pose] ?? BODY.sign)()} alt="" draggable="false" aria-hidden="true" />;
}

export function NinjaFace({ className = '' }) {
  return (
    <span className={`ninja-face ${className}`} aria-hidden="true">
      <img src="/ninja/face.webp" alt="" draggable="false" />
    </span>
  );
}
