import { useEffect } from 'react';

// 事業者を選んだときのお礼（/biz?welcome=1 で来たときだけ）。「使い方を見る」で BizTour（実際の画面で押しながら進むガイド）へ
export function BizWelcome({ onGuide, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="biz-modal-backdrop">
      <section className="biz-modal welcome" role="dialog" aria-modal="true" aria-labelledby="biz-welcome-title" lang="ja">
        <h1 id="biz-welcome-title">お店を載せようと思ってくださって、ありがとうございます</h1>
        <p>日本を旅する人の多くは、ガイドブックには載っていない「地元の人が通うお店」に行ってみたいと思っています。でも、言葉が不安で、のれんをくぐれずに通り過ぎてしまうことも少なくありません。</p>
        <p>LocalDoor は、そんな旅行者とお店をつなぐアプリです。お店の方は日本語だけで大丈夫。掲載文もメッセージも、自動で翻訳して届けます。</p>
        <p>いつものお店の時間が、遠くから来た人にとって、旅でいちばんの思い出になるかもしれません。登録から予約の受け方まで、ここから一緒に進めましょう。</p>
        <div className="btn-row">
          <button type="button" className="btn" onClick={onClose}>
            あとで見る
          </button>
          <button type="button" className="btn primary" onClick={onGuide} autoFocus>
            使い方を見る
          </button>
        </div>
      </section>
    </div>
  );
}
