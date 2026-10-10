// リクエストの「Authorization: Bearer <IDトークン>」を確かめて、ログイン中の人を返す。
// Firebase の IDトークンは、Google が公開している鍵で署名されている。その鍵で署名・発行元・宛先・期限を確かめる。
// 必要なのはプロジェクトIDだけで、サービスアカウントの秘密鍵は使わない（組織のポリシーで鍵を作れなくても動く）。
// 確かめ方は Firebase の公式手順と同じ：https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
// FIREBASE_PROJECT_ID が未設定、またはトークンが無い・不正なときは null。設定方法は docs/firebase-auth.md
import { createRemoteJWKSet, jwtVerify } from 'jose';

const projectId = process.env.FIREBASE_PROJECT_ID;

// Google の公開鍵（自動でキャッシュされ、入れ替わりにも追従する）
const googleKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export async function currentUser(req) {
  const header = req.headers.authorization ?? '';
  if (!projectId || !header.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(header.slice(7), googleKeys, {
      algorithms: ['RS256'],
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    // sub（ユーザーID）が空、またはログイン時刻が未来のトークンは受け付けない
    if (!payload.sub || (payload.auth_time ?? 0) > Date.now() / 1000 + 60) return null;
    return {
      uid: payload.sub,
      provider: payload.firebase?.sign_in_provider ?? 'unknown',
      email: payload.email ?? null,
      phone: payload.phone_number ?? null,
      name: payload.name ?? null,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.warn('ID token rejected:', err.code ?? err.message);
    return null;
  }
}
