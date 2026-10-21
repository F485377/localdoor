import { PRIVACY, TERMS } from './legalTraveler.js';

// 利用規約・プライバシーポリシー（旅行者は英語・簡体字・繁体字・韓国語＝src/legalTraveler.js、事業者は日本語）。
// 運営者名と問い合わせ先はまだ決まっていないので出さない（docs/spec.md の要確認事項）。
// 決まったら name と email を入れる。email が null の間は「お問い合わせ」の欄とリンクを出さない
export const OPERATOR = {
  ja: 'LocalDoor の運営者',
  en: 'the operator of LocalDoor',
  zh: 'LocalDoor运营方',
  zt: 'LocalDoor營運方',
  ko: 'LocalDoor 운영자',
  email: null,
};
export const UPDATED = '2026-10-16';

const H = ({ children }) => <h2>{children}</h2>;
const UPDATED_LABEL = { en: 'Last updated', zh: '最后更新', zt: '最後更新', ko: '최종 변경일', ja: '最終更新日' };

// 旅行者向け（4言語）。文章の中の {operator} と {email} を差し込む
function TravelerDoc({ doc, lang }) {
  const fill = (text) => {
    const parts = text.replaceAll('{operator}', OPERATOR[lang] ?? OPERATOR.en).split('{email}');
    return parts.flatMap((p, i) => (i ? [<a key={i} href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>, p] : [p]));
  };
  return (
    <>
      <h1>{doc.title}</h1>
      <p className="muted small">
        {UPDATED_LABEL[lang]}: {UPDATED}
      </p>
      <p>{fill(doc.intro)}</p>
      {doc.sections.filter((sec) => OPERATOR.email || !(sec.p ?? []).some((x) => x.includes('{email}'))).map((sec) => (
        <section key={sec.h}>
          <H>{sec.h}</H>
          {sec.table && (
            <table>
              <thead>
                <tr>
                  {sec.table[0].map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sec.table.slice(1).map((row) => (
                  <tr key={row[0]}>
                    {row.map((c, i) => (
                      <td key={i}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {sec.li && (
            <ul>
              {sec.li.map((x) => (
                <li key={x}>{fill(x)}</li>
              ))}
            </ul>
          )}
          {sec.p?.map((x) => (
            <p key={x}>{fill(x)}</p>
          ))}
        </section>
      ))}
      {doc.foot && <p className="small muted">{doc.foot}</p>}
    </>
  );
}

function TermsJa() {
  return (
    <>
      <h1>利用規約（事業者向け）</h1>
      <p className="muted small">最終更新日：{UPDATED}</p>
      <p>この規約は、{OPERATOR.ja}（以下「運営」）が提供する LocalDoor（以下「本サービス」）を、店舗を掲載する事業者の方が使うときの決まりです。アカウントを登録した時点で、この規約とプライバシーポリシーに同意したものとします。</p>
      <H>1. 本サービスの役割</H>
      <p>本サービスは、旅行者と事業者をつなぐ仲介です。体験・料理・サービスの内容は事業者が提供し、その責任は事業者が負います。予約は旅行者と事業者の間の約束です。</p>
      <H>2. アカウント</H>
      <ul>
        <li>正しい情報で登録し、パスワードは他人に教えないでください。ご家族など複数の端末で同じアカウントを使うことはできます。</li>
        <li>アカウント画面からいつでも退会できます。これからの予約があるときは、先にキャンセルしてください。退会したアカウントではログインできません。</li>
      </ul>
      <H>3. 掲載</H>
      <ul>
        <li>掲載内容（客層、営業年数、駅からの距離などを含む）は、事実に基づいて正しく書いてください。</li>
        <li>保存すると、すぐに公開されます。運営は公開後に内容を確認し、事実と違う・不適切と判断した掲載は、予告なく非公開にすることがあります。</li>
        <li>掲載文とメッセージは、AI翻訳サービスで英語・中国語（簡体字・繁体字）・韓国語に自動翻訳されます。翻訳に誤りがある可能性があります。</li>
        <li>写真は、ご自身で撮影したものか、使う権利のあるものを載せてください。不適切な写真は運営が削除することがあります。</li>
        <li>「このアプリからの予約の特典」を載せた場合は、その内容を予約したお客様に提供してください。</li>
      </ul>
      <H>4. 予約と支払い</H>
      <ul>
        <li>設定した時間枠の上限人数の内であれば、予約はその場で確定します。予約一覧はこまめにご確認ください（現在、メールでのお知らせはありません）。</li>
        <li>代金は、当日、旅行者から日本円で直接受け取ってください。本サービスは代金の支払いを扱いません。</li>
        <li>やむを得ない事情（臨時休業・天候など）があるときは、理由を選んで予約をキャンセルできます。できるだけ早くキャンセルしてください。</li>
        <li>受け取った旅行者の個人情報（名前、メールアドレス、食事制限など）は、その予約の対応のためだけに使ってください。</li>
      </ul>
      <H>5. 禁止事項</H>
      <ul>
        <li>虚偽の掲載、旅行者への嫌がらせ、本サービスの外での不当な勧誘</li>
        <li>法令に反する行為、本サービスの運営を妨げる行為</li>
      </ul>
      <H>6. 責任の範囲</H>
      <p>運営は本サービスを安定して提供するよう努めますが、常に使えること・誤りがないことは保証しません。運営に故意または重大な過失がある場合を除き、旅行者と事業者の間のトラブル、体験や料理の内容について、運営は責任を負いません。</p>
      <H>7. 変更</H>
      <p>この規約は変更することがあります。最終更新日をこのページに表示します。</p>
      {OPERATOR.email && (
        <>
          <H>8. お問い合わせ</H>
          <p>
            <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
          </p>
        </>
      )}
    </>
  );
}

function PrivacyJa() {
  return (
    <>
      <h1>プライバシーポリシー</h1>
      <p className="muted small">最終更新日：{UPDATED}</p>
      <p>{OPERATOR.ja} が LocalDoor で集める情報と、その使い道、渡す先を説明します。</p>
      <H>事業者の方から集める情報</H>
      <table>
        <thead>
          <tr>
            <th>情報</th>
            <th>使い道</th>
            <th>渡す先</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>メールアドレス</td>
            <td>ログイン、パスワード再設定のメール</td>
            <td>渡さない</td>
          </tr>
          <tr>
            <td>お名前（担当者）</td>
            <td>運営からの連絡</td>
            <td>渡さない</td>
          </tr>
          <tr>
            <td>パスワード</td>
            <td>ログイン（元に戻せない形で保存します）</td>
            <td>渡さない</td>
          </tr>
          <tr>
            <td>写真・地図上の位置</td>
            <td>旅行者への掲載</td>
            <td>旅行者（公開）</td>
          </tr>
          <tr>
            <td>掲載内容・メッセージ</td>
            <td>旅行者への掲載と送信、自動翻訳</td>
            <td>旅行者、AI翻訳サービス</td>
          </tr>
        </tbody>
      </table>
      <H>旅行者の情報の扱い</H>
      <p>予約があると、旅行者の名前、メールアドレス、人数、食事制限、メッセージが事業者に届きます。食事制限は宗教や健康に関わることがあるため、予約の対応のためだけに使い、ほかの目的に使ったり第三者に渡したりしないでください。</p>
      <H>翻訳</H>
      <p>掲載文とメッセージは、翻訳のために外部のAI翻訳サービス（Google Gemini API）に送られます。日本国外のサーバーで処理されることがあります。</p>
      <H>Cookie</H>
      <p>ログインを保つための Cookie を1つ使います。広告や追跡のための Cookie は使いません。</p>
      <H>退会したとき</H>
      <p>アカウント画面から退会できます。退会すると、メールアドレスとパスワードを消し、ログインできなくなります。掲載は非公開になります。過去の予約とチャットは、相手の画面に「退会した事業者」として残ります。</p>
      <H>開示・訂正・削除</H>
      <p>個人情報保護法に基づき、ご自身の個人情報の開示・訂正・削除を求めることができます。</p>
      {OPERATOR.email && (
        <>
          <H>お問い合わせ</H>
          <p>
            <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
          </p>
        </>
      )}
    </>
  );
}

// biz：事業者向け（日本語）。それ以外は旅行者向け（旅行者の言語）
export function LegalPage({ kind, lang, biz = false }) {
  if (biz) {
    const Page = kind === 'terms' ? TermsJa : PrivacyJa;
    return (
      <article className="card legal" lang="ja">
        <Page />
      </article>
    );
  }
  const doc = (kind === 'terms' ? TERMS : PRIVACY)[lang] ?? (kind === 'terms' ? TERMS : PRIVACY).en;
  return (
    <article className="card legal">
      <TravelerDoc doc={doc} lang={lang} />
    </article>
  );
}
