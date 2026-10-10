# Haisai

旅先の言葉が話せない旅行者でも、安心して現地のお店に行けるようにするアプリ。世界中で使えるように作っている。
企画内容は [01_spec.md/idea.txt](01_spec.md/idea.txt) を参照。

## できること

- **ドキちゃんとの会話で初期設定**：最初に開くと、ピンクの3Dハートのキャラクター「ドキちゃん」が光の中から生まれて、自己紹介する（ここまではスマホの言語）。そのあと、言語・名前・出身国・行き先・食事の制限を会話で決める。画面はノベルゲーム風で、ドキちゃんが上、セリフが下の枠に1文字ずつ出る。右上のハートからいつでもやり直せる
- **アカウント**：会話の最後に、電話番号・メールで作れる（Google・Apple の仕組みも入っているが、今は画面に出していない）（Firebase Authentication。[docs/firebase-auth.md](docs/firebase-auth.md)）。プロフィールと予約がアカウントに結びつき、別のスマホでも続きから使える。設定がないあいだはデモ動作
- **地図**：お店をピンで表示。キーを設定すれば Google マップ、なければ OpenStreetMap を使う
- **フィルター**：エリア・種類・価格帯（$〜$$$$）・評価・サービス（英語メニューなど）・食事制限（ベジタリアン・ハラール）を、複数同時に選んで絞り込める。同じ種類の中は「どれか」、種類どうしは「すべて」を満たすお店が出る
- **お店の情報**：価格帯（現地通貨）、営業時間、服装、ルール、使用食材、アレルゲン、治安、外国人の受け入れ態勢。店名は英語と現地の看板の表記の両方を出す
- **口コミと写真**：口コミに料理・内装の写真を4枚までつけられる。投稿すると、お店の詳細の「最新の口コミ」と写真欄にすぐ出る。写真は Vercel Blob（写真置き場 haisai-photos）に保存し、DB には URL だけ持つ
- **マイページ**：プロフィール、自分が口コミした場所の地図、自分の口コミ（写真つき）、検索履歴。ログインしていなくても、この端末で書いた口コミは「自分の口コミ」として出る（端末ごとの目印で見分ける）
- **検索履歴**：検索欄をタップすると最近の検索が出る（この端末に10件まで）
- **予約**：日付はお店の国の時間で扱う。予約後に、お店の国の言葉で書いた「店員さんに見せるカード」が出る
- **デポジット**：予約時に現地通貨で仮押さえし、キャンセルすると返金される。**今はデモ実装で、実際の請求は発生しない**（[lib/payments.js](lib/payments.js)。本番ではStripeなどに差し替える）
- **4言語**：英語・日本語・中国語・韓国語（[src/i18n/messages.js](src/i18n/messages.js) に追加すれば増やせる）
- **お店の情報も選んだ言語で**：説明・服装・ルール・食材・治安・都市名は、お店の `translations` に訳があればその言語で出す（なければ英語）。サンプルの訳は [prisma/sampleTranslations.js](prisma/sampleTranslations.js)。料理の種類と OSM の営業時間の曜日は [src/localize.js](src/localize.js) で訳す

## 構成

| 場所 | 役割 |
| --- | --- |
| `src/` | フロントエンド（Vite + React） |
| `src/components/Heart3D.jsx` | ドキちゃん（three.js） |
| `src/components/Onboarding.jsx` | ドキちゃんとの会話 |
| `src/auth.jsx`, `src/firebaseAuth.js` | アカウント（ログイン） |
| `api/` | Vercel Functions。ブラウザはここ経由でDBにアクセスする |
| `lib/` | API とフロントで共通の処理（絞り込み条件、Prisma、決済） |
| `prisma/` | DBスキーマとサンプルデータ |
| `docs/` | 手順書 |

## セットアップ

1. Vercel でプロジェクトを作り、Storage から Postgres（Neon）を接続する
2. 環境変数を `.env.local` に取得する（`.env.example` を参照）

   ```bash
   vercel env pull .env.local
   ```

3. テーブル作成とサンプルデータの投入

   ```bash
   npm install
   npm run db:push
   npm run db:seed
   ```

4. 開発サーバーを起動する

   ```bash
   npm run dev        # http://localhost:5173 （api/ も一緒に動く）
   ```

## お店を増やす（OpenStreetMap から取り込む）

都市名を指定すると、その都市の飲食店（レストラン・カフェ・バーなど）を OpenStreetMap から取り込んで DB に入れる。

```bash
npm run osm:import -- --city "Naha"
npm run osm:import -- --city "Seoul" --limit 300
npm run osm:import -- --city "New York" --tz America/New_York   # タイムゾーンが複数ある国は指定する
```

- 無料で使え、DB に保存してよい（ODbL）。画面には「© OpenStreetMap contributors」を出している
- 入る情報：店名（英語名と現地の表記）、料理の種類、住所、営業時間、電話、Webサイト、ベジタリアン・ハラール・カード可否（書かれていれば）
- 服装・ルール・治安などは入らないので、画面では「まだ情報がありません」と出す。予約はできない（Haisai と提携したお店だけ予約できる）
- もう一度取り込むと OSM の情報だけ上書きされ、Haisai で足した情報は消えない
- 公開サーバーを使うので、1回に取りすぎない（`--limit` は最大1000）。混んでいるときは別のサーバーに自動で切り替える

## スマホでの見え方をパソコンで確認する

画面はスマホを基本に作っている（幅が狭いと、タブが画面下に移り、フィルターが下から出る）。

- Chrome で開いて `F12` →左上のスマホのアイコン（デバイスツールバー）→「iPhone 14」などを選ぶ
- 同じ Wi-Fi のスマホから見たいときは `npm run dev -- --host` で起動し、表示された `Network:` の URL をスマホで開く

## スマホアプリにするまでの道のり

1. **今：Web アプリ（PWA）**。スマホのブラウザで開いて「ホーム画面に追加」すると、アプリのように全画面で使える（`public/manifest.webmanifest`）
2. **次：Capacitor でアプリ化**。今の React のコードをほぼそのまま使って、iOS / Android のアプリにできる。App Store に出すには Mac と Apple Developer 登録（年額）が必要

## 見るだけのデモ版

`npm run build:demo` で、DB なしでブラウザだけで動くデモ版を `dist-demo/haisai-demo.html` に作れる。お店はサンプルで、プロフィール・口コミ・予約はそのブラウザ内にだけ保存される。地図は背景の代わりに国境線だけを描く。

## デプロイ（公開）

公開先：**https://haisai-puce.vercel.app**（Vercel のプロジェクト「haisai」）

```bash
vercel deploy --prod   # 手元のコードをそのまま本番に公開する
```

- Vercel 側の環境変数（Production）に、次の8つを登録してある：`DATABASE_URL`、`DATABASE_URL_UNPOOLED`、`VITE_FIREBASE_API_KEY`、`VITE_FIREBASE_AUTH_DOMAIN`、`VITE_FIREBASE_PROJECT_ID`、`VITE_FIREBASE_APP_ID`、`FIREBASE_PROJECT_ID`、`VITE_GOOGLE_MAPS_API_KEY`
  - Neon をつないだときに Vercel が自動で作った値は `haisai_DATABASE_URL` のように頭に `haisai_` が付いているので、アプリが読む名前で別に登録している
- `VITE_` で始まる値はブラウザに見える。Firebase のウェブ用キーと Google マップのキーはそういうものなので、Firebase の「承認済みドメイン」と Google の「ウェブサイトの制限」で守る
- `.vercelignore` で、`.env.local` などはアップロードしないようにしている
- GitHub とつなぐと、push するたびに自動で公開されるようにもできる

## iPhone で使う

1. Safari で https://haisai-puce.vercel.app を開く
2. 共有ボタン →「ホーム画面に追加」で、アプリのように全画面で使える

## 注意

- サンプルデータのお店は**すべて架空**。実際のお店を載せるときは、お店の許可を得て正しい情報を入れる
- プロフィールは端末に保存し、ログイン中はアカウント（DB）にも保存する
- 予約の確認・キャンセルはメールアドレスだけで本人確認している。公開前にはログインやメール認証を入れること
