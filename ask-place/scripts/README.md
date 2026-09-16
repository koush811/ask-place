# アカウント一括作成スクリプト (`scripts/createAccounts.js`)

Firebase Admin SDK を使用して、各教室の「クラス管理者」アカウントと、対応する Firestore ドキュメント（`users/{uid}` および `rooms/{roomId}`）を一括作成するスクリプトです。

> **⚠️ 注意: 本ディレクトリ内のファイル（特に `serviceAccountKey.json` や出力される `generated_accounts.csv`）は機密情報を含むため、Git リポジトリや Vercel などの公開環境には絶対に含めないでください。**

---

## 準備手順

### 1. サービスアカウント秘密鍵の取得
1. [Firebase Console](https://console.firebase.google.com/) にアクセスします。
2. 対象プロジェクトの「プロジェクト設定」⚙️ >「サービス アカウント」タブを開きます。
3. 「新しい秘密鍵の生成」をクリックし、JSON ファイルをダウンロードします。
4. ダウンロードしたファイルを `serviceAccountKey.json` にリネームし、この `scripts/` ディレクトリ内に配置します。

### 2. 必要なパッケージのインストール
Admin SDK をまだインストールしていない場合は実行します：
```bash
npm install firebase-admin
```

---

## 実行手順

### デフォルトの部屋（101〜505の25部屋）を作成する場合
```bash
node scripts/createAccounts.js
```

### 特定の部屋番号を指定して作成する場合
引数にスペース区切りで部屋番号を渡します：
```bash
node scripts/createAccounts.js 301 302 303 304 S401 S402
```

---

## 出力ファイル
実行が完了すると、同ディレクトリ内に `generated_accounts.csv` が出力されます：
```csv
roomId,email,password
"301","301@bunkasai.local","X7k9bA2z"
"302","302@bunkasai.local","p0L8mQ1w"
...
```
この CSV のパスワードを各クラスの担当者へ配布します。

※ スーパー管理者のアカウントは本スクリプトの対象外です。Firebase Console から手動で作成し、Firestore の `users/{uid}` に `{ "role": "super_admin" }` を設定してください。
