// 新しい予約の通知音（事業者画面を開いている間だけ）。音のファイルは使わず、Web Audio で「ピンポン」と鳴らす。
// ブラウザは、利用者が一度タップするまで音を出させないので、「音をオンにする」を押したときに準備する
import { store } from '../store.js';

const KEY = 'jimoto-biz-sound';
let ctx = null;

export const soundWanted = () => store.get(KEY, false);

// タップしたときに呼ぶ（音を出せる状態にして、確認のために一度鳴らす）
export async function enableSound() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  await ctx.resume();
  store.set(KEY, true);
  chime();
}

export const soundReady = () => Boolean(ctx && ctx.state === 'running');

export function chime() {
  if (!ctx || ctx.state !== 'running') return false;
  const now = ctx.currentTime;
  [
    [880, 0],
    [660, 0.28],
  ].forEach(([freq, at]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.4, now + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.65);
  });
  return true;
}
