# 文化祭Webサイト セットアップ手順書 (SETUP_GUIDE.md)

本書は、既に作成済みの Firebase プロジェクトと本リポジトリを連携させ、文化祭Webサイトを稼働させるための手順書です。
プロジェクト本体は `ask-place/` ディレクトリ内にあります。

詳細な手順書は以下を参照してください：
👉 [ask-place/SETUP_GUIDE.md](file:///C:/ask-place/ask-place/SETUP_GUIDE.md)

---

## 📋 セットアップの流れ

1. **Firebase コンソールでの機能有効化**
   * Authentication（メール/パスワードを有効化）
   * Cloud Firestore（データベース作成、asia-northeast1 推奨）
   * Firebase Storage（Blazeプラン要、バケット作成）
2. **環境変数の設定 (`.env`)**
   * `ask-place/.env.example` をコピーして `ask-place/.env` を作成
   * Firebase Webアプリの登録情報を入力
3. **セキュリティルールのデプロイ**
   * `firestore.rules` と `storage.rules` をデプロイ
4. **スーパー管理者アカウントの手動作成**
   * Authentication にユーザー追加 + Firestore `users/{uid}` に `{ "role": "super_admin" }` を作成
5. **クラス管理者アカウント・初期データの一括作成**
   * `serviceAccountKey.json` を `ask-place/scripts/` に配置
   * `node ask-place/scripts/createAccounts.js` を実行
   * 生成された `generated_accounts.csv` のパスワードを各クラスに配布
6. **ローカル確認 & Vercel デプロイ**
   * `npm run dev` で動作確認
   * Vercel に環境変数を設定してデプロイ
