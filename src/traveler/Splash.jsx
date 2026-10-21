import { useEffect, useState } from 'react';
import { DoorLogo } from '../components/Logo.jsx';
import { useI18n } from '../i18n/index.jsx';
import { navigate } from '../router.jsx';
import { useSession } from '../session.jsx';
import Onboarding from './Onboarding.jsx';

// ロゴだけの画面 → タップすると引き戸が開いて → 「旅行者」か「お店の方（事業者）」かを選ぶ → 旅行者なら中身（最初の検索）、事業者なら /biz。
// 旅行者でログインしていなければ、先にキャラクターとの会話（言語・通貨・アカウント作成のおすすめ）
export default function Splash({ children }) {
  const { t, lang } = useI18n();
  const { user } = useSession();
  const [step, setStep] = useState('logo');
  // 'open' … 引き戸が開いている間（動きを減らす設定では、すぐに次へ）
  useEffect(() => {
    if (step !== 'open') return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setStep('role'), reduce ? 0 : 1300);
    return () => clearTimeout(timer);
  }, [step]);
  if (step === 'traveler') return children;
  if (step === 'talk') return <Onboarding onDone={() => setStep('traveler')} />;
  if (step === 'role') {
    return (
      <div className="role-pick" role="dialog" aria-modal="true" aria-label={t('role.title')}>
        <div className="role-logo">
          <DoorLogo open />
          <div className="splash-logo" style={{ fontSize: '2.2rem' }}>
            Local<span>Door</span>
          </div>
        </div>
        <h1 className="center" style={{ fontSize: '1.2rem' }}>
          {t('role.title')}
        </h1>
        <button type="button" className="role-btn primary" onClick={() => setStep(user ? 'traveler' : 'talk')} autoFocus>
          <b>{t('role.traveler')}</b>
          <span>{t('role.travelerSub')}</span>
        </button>
        <button type="button" className="role-btn" onClick={() => navigate('/biz?welcome=1')} lang="ja">
          <b>{t('role.business')}</b>
          <span>
            日本語だけで店舗を登録し、予約を受けられます
            {/* 日本語の表示では同じ意味の文が2回になるので、ほかの言語のときだけ訳を添える */}
            {lang !== 'ja' && (
              <>
                <br />
                {t('role.businessSub')}
              </>
            )}
          </span>
        </button>
      </div>
    );
  }
  return (
    <button type="button" className={`splash${step === 'open' ? ' opening' : ''}`} onClick={() => setStep('open')} autoFocus aria-label={t('tapToStart')}>
      <DoorLogo open={step === 'open'} />
      <span className="splash-logo">
        Local<span>Door</span>
      </span>
      <span className="splash-kana" aria-hidden="true">
        ローカルドア
      </span>
      <span className="splash-tagline">{t('tagline')}</span>
      <span className="splash-tap">{t('tapToStart')}</span>
    </button>
  );
}
