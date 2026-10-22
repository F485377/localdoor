import { NinjaBody, NinjaFace } from './Ninja.jsx';

// 旅のおともキャラクター（忍者のリュウ）。つやのあるイラスト（src/components/Ninja.jsx）。
// 何もしないときは、ゆっくり息をするように揺れる（動きを減らす設定では揺れない）。
//   talking … しゃべっている間、小さく弾む
//   skipBirth … 登場の演出（煙玉でドロン）を飛ばす
//   pose="face" … 丸い枠の顔だけ（右下のボタン・会話のアイコン）
//   stance … 全身のときのポーズ：'sign'（印）｜'scroll'（地図の巻物）｜'shuriken'（手裏剣を構える）
export default function Character({ talking = false, skipBirth = false, pose = 'full', stance = 'sign', className = '' }) {
  if (pose === 'face' || pose === 'head') {
    return (
      <span className={`character head-only ${className}`} aria-hidden="true">
        <NinjaFace className="chr-img" />
      </span>
    );
  }
  return (
    <span className={`character${talking ? ' talking' : ''}${skipBirth ? '' : ' birth'} ${className}`} aria-hidden="true">
      <span className="chr-bob">
        <NinjaBody className="chr-img" pose={stance} key={stance} />
      </span>
    </span>
  );
}
