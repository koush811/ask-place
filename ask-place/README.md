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
