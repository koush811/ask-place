# 文化祭Webサイト セットアップ手順書 (SETUP_GUIDE.md)

本書は、既に作成済みの Firebase プロジェクトと本リポジトリを連携させ、文化祭Webサイトを稼働させるための手順書です。

---

## 📋 目次
1. [前提条件](#1-前提条件)
2. [Step 1: Firebase コンソールでの機能有効化](#step-1-firebase-コンソールでの機能有効化)
3. [Step 2: Web アプリの登録と環境変数の設定](#step-2-web-アプリの登録と環境変数の設定)
4. [Step 3: セキュリティルールのデプロイ](#step-3-セキュリティルールのデプロイ)
5. [Step 4: スーパー管理者アカウントの作成](#step-4-スーパー管理者アカウントの作成)
6. [Step 5: クラス管理者アカウント・初期部屋データの一括作成](#step-5-クラス管理者アカウント初期部屋データの一括作成)
7. [Step 6: ローカル環境での動作確認](#step-6-ローカル環境での動作確認)
8. [Step 7: 本番環境 (Vercel) へのデプロイ](#step-7-本番環境-vercel-へのデプロイ)
9. [トラブルシューティング & 運用上の注意点](#9-トラブルシューティング--運用上の注意点)

---

## 1. 前提条件

* **Node.js**: v18.0.0 以上（推奨: v20 LTS）
* **npm**: v9 以上
* **Firebase プロジェクト**: 作成済みであること
  > [!IMPORTANT]
  > Firebase Storage を使用するため、Firebase プロジェクトを **Blazeプラン（従量課金）** にアップグレードしている必要があります（無料枠内での利用であれば請求額は0円のまま維持されます）。

---

## Step 1: Firebase コンソールでの機能有効化

[Firebase Console](https://console.firebase.google.com/) にログインし、作成済みのプロジェクトを開いて以下の3つのサービスを有効化します。

### 1.1 Authentication（認証）の有効化
1. 左メニューの **「構築」 > 「Authentication」** を選択し、「始める」をクリックします。
2. 「Sign-in method」タブから **「メール/パスワード」** を選択します。
3. **「メール/パスワード」を有効** にして「保存」をクリックします（「メールリンク」は無効のままでOKです）。

### 1.2 Cloud Firestore（データベース）の作成
1. 左メニューの **「構築」 > 「Firestore Database」** を選択し、「データベースの作成」をクリックします。
2. ロケーション（リージョン）を選択します（日本国内であれば `asia-northeast1 (Tokyo)` を推奨）。
3. セキュリティルールは後ほどデプロイするため、「本番環境モード」を選択して作成を完了します。

### 1.3 Firebase Storage（画像保存庫）の作成
1. 左メニューの **「構築」 > 「Storage」** を選択し、「始める」をクリックします。
2. セキュリティルールは「本番環境モード」を選択し、ロケーションを確認して作成を完了します。

---

## Step 2: Web アプリの登録と環境変数の設定

フロントエンドから Firebase に接続するための設定値を取得し、ローカルの環境変数ファイルを作成します。

### 2.1 Web アプリの登録
1. Firebase Console のホーム（プロジェクトの概要）に戻り、画面中央の **「</>」(ウェブアイコン)** をクリックします。
2. アプリのニックネーム（例: `bunkasai-web`）を入力して「アプリを登録」をクリックします（Firebase Hostingの設定チェックは不要です）。
3. 画面に表示される `firebaseConfig` の値を確認します：
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "your-project-id.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.firebasestorage.app",
     messagingSenderId: "123456789...",
     appId: "1:123456789...:web:abc123..."
   };
   ```

### 2.2 `.env` ファイルの作成
本プロジェクトのルートディレクトリ（`ask-place/`）で、提供されている [.env.example](file:///C:/ask-place/ask-place/.env.example) をコピーして `.env` を作成します。

```bash
# Windows PowerShell の場合
Copy-Item .env.example .env
```

作成した `.env` ファイルを開き、先ほど取得した値を入力します：

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789...
VITE_FIREBASE_APP_ID=1:123456789...:web:abc123...

# 任意: App Check を手動設定した場合のみ reCAPTCHA v3 の Site Key を設定
VITE_APPCHECK_SITE_KEY=
```

> [!CAUTION]
> `.env` ファイルにはプロジェクト固有の識別子が含まれるため、Git にコミットしないでください（既に `.gitignore` に含まれています）。

---

## Step 3: セキュリティルールのデプロイ

リポジトリ内に用意されている [firestore.rules](file:///C:/ask-place/ask-place/firestore.rules) と [storage.rules](file:///C:/ask-place/ask-place/storage.rules) を Firebase に適用します。

### 方法A: Firebase CLI を使用してデプロイ（推奨）

1. Firebase CLI をインストール（未導入の場合）：
   ```bash
   npm install -g firebase-tools
   ```
2. Firebase にログイン：
   ```bash
   firebase login
   ```
3. プロジェクトを紐付け：
   ```bash
   firebase use --add
   # 表示される一覧から対象の Firebase プロジェクトを選択し、エイリアス（default など）を入力
   ```
4. ルールを一括デプロイ：
   ```bash
   firebase deploy --only firestore:rules,storage
   ```

### 方法B: Firebase Console から手作業で貼り付け
CLI を使わない場合、コンソール画面から直接コピー＆ペーストして公開できます：
1. **Firestore**: コンソールの「Firestore Database」>「ルール」タブを開き、リポジトリの `firestore.rules` の内容を貼り付けて「公開」をクリック。
2. **Storage**: コンソールの「Storage」>「ルール」タブを開き、リポジトリの `storage.rules` の内容を貼り付けて「公開」をクリック。

---

## Step 4: スーパー管理者アカウントの作成

文化祭全体を統括・全教室の公開/非公開や内容を管理できる「スーパー管理者」アカウントを手動で作成します。

### 4.1 ユーザーの作成
1. Firebase Console の **「Authentication」 > 「Users」** タブを開きます。
2. **「ユーザーを追加」** をクリックします。
3. メールアドレスとパスワードを入力して作成します：
   * **メールアドレス**: 例 `admin@bunkasai.local` またはご自身のメールアドレス
   * **パスワード**: 強固なパスワードを設定

### 4.2 Firestore に権限（super_admin）を登録
1. 作成したユーザー一覧から、該当ユーザーの **「ユーザー UID」**（長い英数字）をコピーします。
2. **「Firestore Database」 > 「データ」** タブを開きます。
3. **「コレクションを開始」** をクリックします：
   * **コレクション ID**: `users`
   * **ドキュメント ID**: 先ほどコピーした **ユーザー UID** を入力
   * **フィールド**:
     * フィールド名: `role`
     * タイプ: `string`
     * 値: `super_admin`
4. 「保存」をクリックします。
これで、該当アカウントでログインすると自動的に「スーパー管理者画面」が開くようになります。

---

## Step 5: クラス管理者アカウント・初期部屋データの一括作成

約100部屋分のクラス管理者アカウント（ユーザー名は教室番号、推測困難なランダムパスワード）と Firestore の初期ドキュメントを一括生成します。

### 5.1 サービスアカウント秘密鍵の配置
1. Firebase Console の **「プロジェクト設定」⚙️ > 「サービス アカウント」** タブを開きます。
2. **「新しい秘密鍵の生成」** をクリックし、JSON ファイルをダウンロードします。
3. ダウンロードしたファイルを `serviceAccountKey.json` にリネームし、`scripts/` ディレクトリ内に配置します：
   ```text
   ask-place/
   └── scripts/
       ├── serviceAccountKey.json   ← ここに配置
       ├── createAccounts.js
       └── README.md
   ```

### 5.2 対象部屋の確認・編集
[scripts/createAccounts.js](file:///C:/ask-place/ask-place/scripts/createAccounts.js) の末尾にある `targetRooms` 配列を確認し、実際に使用する教室番号リストに調整します（またはコマンドライン引数で渡します）。

### 5.3 スクリプトの実行
スクリプト実行に必要な `firebase-admin` をインストールして実行します：

```bash
# プロジェクトルートで実行
npm install firebase-admin --save-dev

# スクリプトを実行（デフォルトの部屋一覧を生成）
node scripts/createAccounts.js

# または特定の教室番号を指定して実行
# node scripts/createAccounts.js 101 102 201 202 301 302 S401 S402
```

### 5.4 出力されたパスワード一覧の確認
スクリプトが成功すると、`scripts/generated_accounts.csv` が出力されます：
```csv
roomId,email,password
"301","301@bunkasai.local","k9Xa2_b8"
"302","302@bunkasai.local","p0L8mQ1w"
...
```
* 各クラスの担当者には **「ユーザー名: 301」「パスワード: k9Xa2_b8」** のように配布します。
* Firestore には各部屋の初期データが `enabled: false`（非公開）として登録されます。各クラスが準備完了後、スーパー管理者が管理画面で公開（`enabled: true`）に切り替える運用です。

---

## Step 6: ローカル環境での動作確認

1. 依存パッケージのインストール（未実行の場合）：
   ```bash
   npm install
   ```
2. 開発サーバーの起動：
   ```bash
   npm run dev
   ```
3. ブラウザで `http://localhost:5173`（または表示されたURL）にアクセスします。

### 動作確認チェックリスト
* [ ] **トップページ (`/`)**: 展示一覧リンク、マップが正常に表示されるか。
* [ ] **展示一覧 (`/rooms`)**: ソート切り替え（階数順・空いている順）や検索が動作するか。
* [ ] **管理画面ログイン (`/admin`)**:
  * クラス管理者のユーザー名（例: `301`）とパスワードでログインできるか。
  * ログイン後、自教室のタイトル・説明・混雑状況（空/やや混雑/混雑）・写真の更新ができるか。
* [ ] **スーパー管理者画面 (`/admin`)**:
  * スーパー管理者のアカウントでログインできるか。
  * 全部屋一覧が表示され、`enabled`（公開/非公開）のトグル切り替えができるか。
* [ ] **部屋詳細 (`/room/:id`)**:
  * `enabled: true` の部屋の詳細が写真付きで表示されるか。
  * `enabled: false` の部屋にアクセスした際、トップページに自動リダイレクトされるか。

---

## Step 7: 本番環境 (Vercel) へのデプロイ

本プロジェクトは Vercel へのデプロイに最適化されています。

### 7.1 Vercel へのインポート
1. コードを GitHub リポジトリ等に push します。
2. [Vercel Dashboard](https://vercel.com/) で「Add New...」>「Project」を選択し、リポジトリをインポートします。
3. **Framework Preset**: `Vite`
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`

### 7.2 環境変数の登録
Vercel のプロジェクト設定「Environment Variables」に、Step 2 で設定した環境変数を追加します：

| 環境変数名 | 値の例 |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project-id.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project-id.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789...` |
| `VITE_FIREBASE_APP_ID` | `1:123456789...:web:abc123...` |
| `VITE_APPCHECK_SITE_KEY` | *(App Check使用時のみ)* |

5. 「Deploy」をクリックして完了です。
   > [!NOTE]
   > [vercel.json](file:///C:/ask-place/ask-place/vercel.json) にて、Firebase 各種ドメインおよび Storage 画像を許可する Content Security Policy (CSP) が既に構成されています。

---

## 9. トラブルシューティング & 運用上の注意点

### Q. 管理画面でログイン時に「ユーザー名またはパスワードが正しくありません」となる
* アカウント作成スクリプトが正常に実行されているか、Authentication の「Users」一覧に該当メール（例: `301@bunkasai.local`）が存在するか確認してください。
* Firestore の `users/{uid}` ドキュメントに `{ "role": "class_admin", "roomId": "301" }` が正しく設定されているか確認してください。

### Q. 写真のアップロードが失敗する
* Storage のセキュリティルール（`storage.rules`）がデプロイされているか確認してください。
* アップロードしようとしている画像が破損していないか、また Storage バケット名が環境変数 `VITE_FIREBASE_STORAGE_BUCKET` と一致しているか確認してください。

### Q. パスワードを紛失したクラスがある場合
* 管理画面上にパスワード再発行機能は意図して設けていません（仕様書準拠）。
* 運営者（スーパー管理者）が Firebase Console の「Authentication」>「Users」から該当ユーザーの行の「︙」メニューを開き、「パスワードをリセット」または手動で新しいパスワードに変更して伝達してください。

### Q. 文化祭終了後の注意
* 写真データやログのバックアップが必要な場合は、Firebase Console からエクスポートを行ってください。
* Blaze プランの意図しない課金を防ぐため、不要になった場合はプロジェクトの利用停止または予算アラートの設定を確認してください。
