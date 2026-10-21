// メール（Resend）。MVP で送るのはパスワード再設定のメールだけ。
// RESEND_API_KEY と MAIL_FROM がなければ送らない。開発中はリンクをサーバーのログに出す。
const baseUrl = () => process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');
export const appUrl = (path = '') => `${baseUrl().replace(/\/$/, '')}${path}`;
export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export async function sendMail({ to, subject, text }) {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV === 'production') console.error('mail: RESEND_API_KEY / MAIL_FROM が設定されていないため送れませんでした');
    else console.log(`\n[mail] 送らずに表示します（RESEND_API_KEY がありません）\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return false;
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, text }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    console.error('mail', r.status, await r.text().catch(() => ''));
    return false;
  }
  return true;
}

// パスワード再設定。事業者には日本語、旅行者にはその人の言語で送る
const RESET = {
  en: ['LocalDoor: reset your password', "We received a request to reset your password.\n\nOpen the link below to set a new one (valid for 1 hour, one use only):\n{link}\n\nIf you didn't ask for this, you can ignore this email. Your password stays the same."],
  zh: ['LocalDoor：重置密码', '我们收到了重置密码的请求。\n\n请打开以下链接设置新密码（1小时内有效，仅可使用一次）：\n{link}\n\n如果这不是您本人的操作，请忽略此邮件，您的密码不会改变。'],
  zt: ['LocalDoor：重設密碼', '我們收到了重設密碼的請求。\n\n請開啟以下連結設定新密碼（1小時內有效，僅可使用一次）：\n{link}\n\n如果這不是您本人的操作，請忽略此郵件，您的密碼不會改變。'],
  ko: ['LocalDoor: 비밀번호 재설정', '비밀번호 재설정 요청을 받았습니다.\n\n아래 링크에서 새 비밀번호를 설정해 주세요(1시간 동안 1회만 사용 가능).\n{link}\n\n요청하신 적이 없다면 이 메일을 무시하셔도 됩니다. 비밀번호는 바뀌지 않습니다.'],
  ja: ['【LocalDoor】パスワードの再設定', 'パスワードの再設定を受け付けました。\n\n下のリンクから、新しいパスワードを設定してください（1時間以内・1回だけ使えます）。\n{link}\n\n心当たりがない場合は、このメールを破棄してください。パスワードは変わりません。'],
};

export function resetMail(user, link) {
  const [subject, text] = RESET[user.role === 'BUSINESS' ? 'ja' : user.lang] ?? RESET.en;
  return { subject, text: text.replace('{link}', link) };
}
