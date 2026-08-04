# 校内マップ案内サイト (ask-place)

仕様書に基づいた学校説明会向け Web サイトです。React (Vite) + `react-router-dom` +
`react-zoom-pan-pinch` で構築しています。

## セットアップ

```bash
npm install
npm run dev       # 開発サーバー
npm run build     # 本番ビルド (dist/ に出力)
npm run preview   # ビルド結果のプレビュー
```

Vercel へのデプロイは `npm run build` の設定のまま import するだけで動作します
(Framework Preset: Vite)。

## 🔥 Firebase セットアップ(展示情報の管理画面 / リアルタイム表示)

展示情報(`activity.json`)は Firestore へ移行できるようになっています。
Firestoreにデータが無いうちは自動的に `src/data/activity.json` の内容がそのまま
表示されるので、Firebaseを設定しなくても公開ページは問題なく動作します。

### 1. Firebaseプロジェクトを作成

[Firebaseコンソール](https://console.firebase.google.com/) で新規プロジェクトを作成し、
以下を有効化してください。

- **Authentication** → Sign-in method で「メール/パスワード」を有効化 → 管理者アカウントを1つ作成
- **Firestore Database** → 本番環境モードで作成
- **Storage** → 有効化

### 2. セキュリティルールを設定

プロジェクト直下の `firestore.rules` と `storage.rules` の内容を、Firebaseコンソールの
「Firestore Database → ルール」「Storage → Rules」にそれぞれ貼り付けて公開してください
(read: 全員 / write: ログイン済みのみ、という要件通りの内容になっています)。

Firebase CLIを使う場合:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage:rules
```

### 3. .env を作成

```bash
cp .env.example .env
```

Firebaseコンソール → プロジェクトの設定 → 全般 → 「マイアプリ」 の設定値を
`.env` の各項目にコピーしてください。`.env` は `.gitignore` 済みなのでコミットされません。

### 4. 管理画面にログイン

```
/admin/login
```

Authenticationで作成したメールアドレス・パスワードでログインすると `/admin` の
編集画面に入れます。展示を選択 → 部屋を選択(画像を追加する場合) → 説明文編集・
画像アップロード → 送信、で Firestore / Storage が更新され、公開ページにも
(`onSnapshot` による購読で)即座に反映されます。

### Firestoreのデータ構造

```
activities (collection)
 └ construction (document, ID = activity.jsonのidと対応)
    {
      name: "建設科",
      color: "#e8752c",
      description: "建設科の展示・体験コーナーです。",
      rooms: ["N101", "C106"],
      images: [
        { room: "N101", url: "https://firebasestorage.googleapis.com/..." }
      ]
    }
```

`src/data/activity.json` の各要素の `id` が、そのままFirestoreのドキュメントIDに
対応する設計にしてあります。

## ⚠️ 教室データについて

アップロードいただいたファイル一式には `campus_map_data.json`
本体が含まれておらず(フロア画像 F1〜F5.png のみ確認できました)、
`src/data/campus_map_data.json` は **仕様書のサンプル値をベースにした暫定データ**
になっています。実際の教室配置ではありませんので、公開前に必ず差し替えてください。

### データの直し方

1. `src/map/F1.png`〜`F5.png` を開き、各教室・分岐点・入口・階段の位置を確認します。
2. 画像の左上を原点 (0,0)、右方向を X、下方向を Y として、各地点の座標(px)を調べます
   (画像編集ソフトのカーソル座標や、ブラウザで画像を表示して DevTools で確認するのが簡単です)。
3. `src/data/campus_map_data.json` に、以下の形式で1教室ずつ追加してください。

```json
{
  "id": "N101",          // ユニークなID
  "floor": "floor_1F",   // floor_1F〜floor_5F
  "x": 40,
  "y": 60,
  "name": "N101",        // 部屋番号(検索・スタンプ判定のキー)
  "type": "room"         // room / stamp / branch / entrance / stairs
}
```

正しいデータに差し替えれば、マップ表示・検索・スタンプ機能はすべてそのまま動作します。

## 主な構成

```
src
├── assets/imgs        トップ画像用(任意で追加してください)
├── components          Header / Footer / FloorSelector / SearchForm /
│                        MapView / RoomInfoModal / StampProgress
├── data/campus_map_data.json
├── map/F1〜F5.png
├── pages/Home.jsx       メイン画面
├── pages/StampPage.jsx  QRコード着地ページ (/stamp/:roomNumber)
└── utils/stamps.js      LocalStorage (stampData) 操作
```

## 実装した機能

- **校内マップ**: フロア切替(ラジオボタン形式のタブ)、ピンチ/ホイールでの拡大縮小・移動
  (`react-zoom-pan-pinch`)、type ごとの色分けピン(room=黄, stamp=青, branch=灰,
  entrance=緑, stairs=水色)。room / stamp のピンのみタップ可能で、部屋番号・フロアを表示。
- **教室検索**: 部屋番号の部分一致検索、候補タップで該当フロアへ切替 + 赤枠強調表示、
  該当なしの場合は「該当する教室が見つかりません」を表示。
- **スタンプ機能**: `/stamp/:roomNumber` へアクセスすると該当教室のフロアへ切替 + 強調表示
  + スタンプ取得。取得状況は `localStorage` の `stampData` キーに配列で保存し、重複取得を防止。
  全スタンプ取得で「すべてのスタンプを取得しました」を表示。

## 写真ギャラリー機能のセットアップ(要作業)

来場者が写真を投稿できるギャラリー機能を追加しました。**Vercel Blob** というVercel純正のストレージ機能を使っています(新しいサービスへの登録・クレジットカード登録不要、無料枠のまま利用可能)。

### 1. Vercel Blobストアを作成する

1. Vercelのプロジェクトダッシュボードを開く
2. `Storage` タブ → `Create Database` → `Blob` を選択
3. 作成すると `BLOB_READ_WRITE_TOKEN` という環境変数が自動でプロジェクトに設定されます(自分で入力する必要はありません)

### 2. 管理者用の合言葉を設定する

1. プロジェクトの `Settings` → `Environment Variables`
2. `ADMIN_PASSCODE` という名前で、承認作業に使う合言葉(パスワード)を追加(例: `sc2026-photo`)
3. Production/Previewどちらにもチェックを入れて保存

この2つを設定してから再デプロイしてください。

### 使い方

- **来場者**: フッターの「📷 写真ギャラリーはこちら」から `/gallery` にアクセスし、写真を投稿できます。投稿してもすぐには公開されません。
- **学校側(承認)**: `/admin/photos` にアクセスし、`ADMIN_PASSCODE` で設定した合言葉を入力すると、承認待ちの写真が一覧表示されます。「承認」を押すとギャラリーに公開されます。「却下」を押すと削除されます。

このURL(`/admin/photos`)はサイト上のどこにもリンクを置いていないので、直接URLを知っている人だけがアクセスできます。ただし合言葉だけが認証手段なので、他人に知られないよう管理してください。

### 容量の目安

Vercel Blobの無料枠は「1GBの保存容量」「月10GBの転送量」です。投稿写真は自動で横幅1600px・JPEG品質80%に圧縮してからアップロードするので、1枚あたり概ね300KB〜800KB程度に収まります。1GBあれば1,000〜3,000枚程度は保存できる計算です。
