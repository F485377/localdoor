# アカウント作り（Firebase Authentication）を使えるようにする

ドキちゃんとの会話の最後で、**Google・Apple・電話番号・メール**のどれかでアカウントを作れます。
ログインの仕組みは Google の **Firebase Authentication** に任せています。
- 設定がないあいだは「デモ動作」です。画面の流れは試せますが、本物のアカウントは作られません。電話番号のコードは `123456` で通ります
- 下の手順で `.env.local` に値を書くと、本物のログインに切り替わります

アカウントがあると、次のことができるようになります。

- プロフィール（名前・言語・出身国・行き先・食事の制限）がサーバーに保存される。別のスマホで「アカウントをお持ちの方はこちら」からログインすると、元に戻る
- ログイン中にした予約がアカウントに結びつく。予約一覧でメールアドレスを入れなくても、自分の予約が出る

---

## 1. Firebase プロジェクトを作る

1. <https://console.firebase.google.com/> を開き、「プロジェクトを追加」
   - Google マップで作った Google Cloud プロジェクトを選ぶと、まとめて管理できます
2. 「Authentication」を開いて「始める」を押す
   - 左上の **≡** でメニューを開き、「Authentication」を探す（Firebase の画面は時々作り直されるので、「構築」「セキュリティ」など、どのグループに入っているかは変わることがあります）
   - 見つからないときは、アドレス欄を `https://console.firebase.google.com/project/（プロジェクトID）/authentication` にすると直接開けます
   - 右側に Gemini（AIアシスタント）の画面が出ていたら、× で閉じてかまいません

## 2. ログイン方法を有効にする

「Authentication」→「Sign-in method」で、使う方法をそれぞれ「有効にする」にします。

| 方法 | 必要なこと |
| --- | --- |
| **メール / パスワード** | 有効にするだけ |
| **Google** | 有効にして、サポート用メールを選ぶだけ |
| **電話番号** | 有効にする。**SMSの送信は有料**なので、プロジェクトを従量課金（Blaze）プランにする必要があります。料金は Firebase の料金ページで確認してください。開発中は「テスト用の電話番号」を登録すると、SMSを送らずに試せます |
| **Apple** | **Apple Developer Program（年会費あり）への登録が必要**。Apple 側で「Services ID」と「鍵」を作り、Firebase に登録します。Firebase の画面にある手順のリンクに沿って進めてください |

## 3. 使ってよいドメインを登録する

「Authentication」→「Settings」→「承認済みドメイン」に、次を追加します。

- `localhost`（最初から入っています）
- `あなたのプロジェクト.vercel.app`（本番の URL）

## 4. ブラウザ用の設定値を取る

1. 「プロジェクトの設定」（歯車）→「全般」→「マイアプリ」→「</>（ウェブ）」でアプリを追加
2. 表示された `firebaseConfig` の値を `.env.local` に書く

```bash
VITE_FIREBASE_API_KEY="apiKey の値"
VITE_FIREBASE_AUTH_DOMAIN="authDomain の値"
VITE_FIREBASE_PROJECT_ID="projectId の値"
VITE_FIREBASE_APP_ID="appId の値"
```

この4つは、ブラウザに出ても問題ない値です（守りは「承認済みドメイン」でかけます）。

## 5. サーバー用の設定

サーバー（`api/`）は、送られてきたログイン情報（IDトークン）が本物かを確かめます。
確かめるのに必要なのは**プロジェクトIDだけ**です（Google が公開している鍵で署名をチェックします）。

```bash
FIREBASE_PROJECT_ID="projectId の値（手順4と同じ）"
```

サービスアカウントの秘密鍵（JSON）は**不要**です。
会社や学校の Google アカウントでは「サービス アカウントの鍵の作成が許可されていません」と出て作れないことがありますが、このアプリはその鍵を使わないので問題ありません。

## 6. DB を更新して起動する

```bash
npm run db:push   # User テーブルと、予約の userId 列が追加される
npm run dev       # 起動し直す（VITE_ の値は起動時にしか読まれない）
```

Vercel にも同じ5つの値を「Settings」→「Environment Variables」に登録して、もう一度デプロイします。

## スマホアプリ（Capacitor）にするとき

アプリの中では、Google・Apple のログイン画面（ポップアップ）がそのままでは開きません。
アプリ化するときに `@capacitor-firebase/authentication` というプラグインに切り替えます。切り替える場所は [src/firebaseAuth.js](../src/firebaseAuth.js) だけです。

## うまくいかないとき

- 「auth/unauthorized-domain」と出る → 手順3の承認済みドメインに、今開いている URL のドメインが入っているか確認する
- 電話番号でコードが届かない → 番号を「+81 90...」のように国番号から入れているか、Blaze プランになっているか確認する
- ログインはできるのに、別のスマホでプロフィールが戻らない → `FIREBASE_PROJECT_ID`（手順5）が入っているか確認する。入っていないと、サーバーはログインを確かめられません
