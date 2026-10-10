# Google マップと連携する

Haisai のコードには、Google マップを使うための部分がもう入っています。
**キーを取得して `.env.local` に書くだけ**で、次の2つが動くようになります。

| できるようになること | 使うAPI | 設定する環境変数 |
| --- | --- | --- |
| 地図を Google マップで表示する | Maps JavaScript API | `VITE_GOOGLE_MAPS_API_KEY`（＋任意で `VITE_GOOGLE_MAPS_MAP_ID`） |
| お店の詳細に Google の口コミを出す | Places API (New) | `GOOGLE_MAPS_API_KEY` |

キーが無いときは、今までどおり OpenStreetMap の地図で動きます。

---

## 1. Google Cloud の準備（最初の1回だけ）

1. <https://console.cloud.google.com/> に Google アカウントでログインする
2. 画面上部のプロジェクト選択 →「新しいプロジェクト」→ 名前を `haisai` などにして作成
3. 左メニュー「お支払い」で**請求先アカウントを設定**する
   - Google マップのAPIは、無料の範囲で使う場合でもカード登録が必要です
   - 無料で使える量はAPIごとに決まっています。最新の内容は[料金ページ](https://mapsplatform.google.com/pricing/)で確認してください
4. **予算アラートを設定する**（大事）
   「お支払い」→「予算とアラート」で、たとえば月 1,000 円を超えたらメールが来るようにしておくと安心です

## 2. API を有効にする

「APIとサービス」→「ライブラリ」で次の2つを検索し、それぞれ「有効にする」を押します。

- **Maps JavaScript API**（地図の表示）
- **Places API (New)**（口コミの取得）。名前に「(New)」が付いている方を選んでください

## 3. キーを2つ作る

「APIとサービス」→「認証情報」→「認証情報を作成」→「APIキー」で、**キーを2つ**作ります。
1つのキーを使い回さず、用途ごとに分けて制限をかけるのが安全です。

### ブラウザ用のキー（地図の表示）

ブラウザに渡すキーは、誰でも見られます。そのため、必ず制限をかけてください。

- **アプリケーションの制限**：「ウェブサイト」を選び、次を追加する
  - `http://localhost:5173/*`（開発用）
  - `https://あなたのプロジェクト.vercel.app/*`（本番用）
- **API の制限**：「Maps JavaScript API」だけにチェック
- このキーを `VITE_GOOGLE_MAPS_API_KEY` に入れる

### サーバー用のキー（口コミの取得）

`api/google-reviews.js` だけが使うキーです。ブラウザには出ません。

- **API の制限**：「Places API (New)」だけにチェック
- このキーを `GOOGLE_MAPS_API_KEY` に入れる

## 4. （任意）地図IDを作る

ピンのデザインを Google マップ標準のきれいなもの（Advanced Marker）にするには、地図IDが必要です。

- 「Google Maps Platform」→「マップ管理」→「地図IDを作成」
- 種類は「JavaScript」、「ベクター」を選ぶ
- できたIDを `VITE_GOOGLE_MAPS_MAP_ID` に入れる

設定しない場合は、Google が用意しているテスト用の `DEMO_MAP_ID` を使います。開発中はそれで十分です。

## 5. 環境変数に書く

### 手元のパソコン

`.env.local` に追記します（`.env.example` に見本があります）。

```bash
VITE_GOOGLE_MAPS_API_KEY="ブラウザ用のキー"
VITE_GOOGLE_MAPS_MAP_ID=""
GOOGLE_MAPS_API_KEY="サーバー用のキー"
```

書いたら `npm run dev` を**起動し直して**ください。`VITE_` で始まる値は、起動時にしか読み込まれません。

### Vercel（本番）

Vercel Dashboard →プロジェクト→「Settings」→「Environment Variables」に同じ3つを登録し、もう一度デプロイします。

## 6. お店と Google の情報をつなぐ

口コミを出すには、DB のお店に **Google の Place ID** を入れます。

1. [Place ID Finder](https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder) でお店を検索する
2. 表示された `ChIJ...` で始まるIDをコピーする
3. `npm run db:studio` で Prisma Studio を開き、そのお店の `googlePlaceId` に貼り付ける

これで、お店の詳細画面の下に「Google の口コミ」が出るようになります。

## 守らないといけないルール

Google マップのデータには利用規約があります。特に次の3点に気をつけてください。

- **Google の口コミや評価を、Google 以外の地図と一緒に出さない**。地図を表示する画面で Google のデータを使うなら、地図も Google マップにする必要があります。このアプリは `VITE_GOOGLE_MAPS_API_KEY` があると自動で Google マップに切り替わるので、**口コミ用のキー（`GOOGLE_MAPS_API_KEY`）を入れるときは、地図用のキーも必ず一緒に入れてください**
- **口コミには投稿者名を表示する**（今のコードで表示しています）
- **Google から取ったデータを、自分の DB にずっと保存しない**。今のコードは、表示のたびに取り直しています（キャッシュは1時間）

## うまく動かないとき

- 地図が灰色で「このページでは Google マップが正しく読み込まれませんでした」と出る
  → キーの「ウェブサイト」制限に、今開いている URL が入っているか確認する
- 口コミが出ない
  → `GOOGLE_MAPS_API_KEY` が設定されているか、お店に `googlePlaceId` が入っているか、Places API **(New)** が有効か確認する
- ブラウザの開発者ツール（F12）の「Console」に、原因がエラーメッセージで出ます
