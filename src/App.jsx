import { Suspense, lazy } from 'react';
import { usePath } from './router.jsx';
import TravelerApp from './traveler/TravelerApp.jsx';

// 旅行者画面（英語）と事業者画面（/biz、日本語）を1つにまとめている
const BizApp = lazy(() => import('./biz/BizApp.jsx'));

export default function App() {
  const { pathname } = usePath();
  if (pathname === '/biz' || pathname.startsWith('/biz/')) {
    return (
      <Suspense fallback={null}>
        <BizApp />
      </Suspense>
    );
  }
  return <TravelerApp />;
}
