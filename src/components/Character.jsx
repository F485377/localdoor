import { useEffect, useState } from 'react';
import { NinjaBody, NinjaFace } from './Ninja.jsx';

// 旅のおともキャラクター（忍者のリュウ）。つやのあるイラスト（src/components/Ninja.jsx）。
// 何もしないときは、ゆっくり息をするように揺れる（動きを減らす設定では揺れない）。
//   talking … しゃべっている間、小さく弾む
//   skipBirth … 登場の演出（煙玉でドロン）を飛ばす
//   pose="face" … 丸い枠の顔だけ（右下のボタン・会話のアイコン）
//   stance … 全身のときのポーズ。変わるときは、前のポーズからゆっくり入れかわる（重ねてじわっと切りかえる）
export default function Character({ talking = false, skipBirth = false, pose = 'full', stance = 'sign', className = '' }) {
  const [shown, setShown] = useState(stance);
  const [prev, setPrev] = useState(null);
  useEffect(() => {
    if (stance === shown) return undefined;
    setPrev(shown);
    setShown(stance);
    const timer = setTimeout(() => setPrev(null), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stance]);
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
        {prev && <NinjaBody className="chr-img pose-out" pose={prev} key={`out-${prev}`} />}
        <NinjaBody className={`chr-img${prev ? ' pose-in' : ''}`} pose={shown} key={shown} />
      </span>
    </span>
  );
}
