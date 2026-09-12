# 文化祭Webサイト コーディング仕様書

本書は `文化祭Webサイト仕様書(改訂版)` の内容をもとに、AIコーディングエージェント(Claude Code等)が実装作業を進めるための技術仕様に落とし込んだものです。

**基本仕様の意図・背景(なぜそうするか)は元の仕様書を参照してください。本書は「何をどう作るか」に特化した実装指示書です。**

言語は **JavaScript(TypeScriptは使用しない)** とする。型情報が有用な箇所はJSDocコメントで補足する。

---

# 0. 前提条件

* フロントエンド:React(SPA、React Router使用)、JavaScript(.jsx / .js)
* ホスティング:Vercel
* バックエンド:Firebase(Blazeプラン。詳細は第7章)
  * Firebase Authentication(Email/Password)
  * Cloud Firestore
  * Firebase Storage
  * Firebase App Check(手動設定。本書のスコープ外。コード側でのApp Check初期化コード組み込みのみ対応)
* 画像圧縮:`browser-image-compression`(npm)
* 文化祭開催:2日間、来場者2,000〜3,000人、使用部屋数は最大196部屋中、実際は約100部屋

---

# 1. ディレクトリ構成(提案)

```text
src/
├── main.jsx
├── App.jsx                      # ルーティング定義、共有ステートのProviderをラップ
├── router/
│   └── routes.jsx
├── context/
│   └── RoomsContext.jsx         # 第4章:全部屋データの共有ステート
├── pages/
│   ├── HomePage.jsx              # /
│   ├── RoomsListPage.jsx         # /rooms
│   ├── RoomDetailPage.jsx        # /room/:id
│   └── admin/
│       ├── LoginPage.jsx         # /admin (未ログイン時)
│       ├── ClassAdminPage.jsx    # /admin (class_admin ログイン後)
│       └── SuperAdminPage.jsx    # /admin (super_admin ログイン後)
├── components/
│   ├── Slideshow.jsx
│   ├── SchoolMap.jsx             # 実装済みのものを移設
│   ├── RoomCard.jsx
│   ├── RoomList.jsx
│   ├── StatusBadge.jsx
│   └── ...
├── lib/
│   ├── firebase.js               # Firebase初期化(Auth/Firestore/Storage/App Check)
│   ├── auth.js                   # ログインUI用のユーザー名→メール変換など
│   ├── imageUpload.js            # browser-image-compression + Storageアップロード処理
│   └── roomStatus.js             # 混雑状況の列挙値・重み定義
├── types/
│   └── room.js                   # JSDocによる型定義(Room, AdminUser等)
└── data/
    └── mapData.json              # 実装済みの学校マップJSON
```

---

# 2. ルーティング定義

React Router を使用し、以下の4ルートを定義する。

```jsx
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/rooms" element={<RoomsListPage />} />
  <Route path="/room/:id" element={<RoomDetailPage />} />
  <Route path="/admin/*" element={<AdminRouter />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

* `/room/:id` の `id` は `roomId`(例:`301`)と一致させる
* 未定義ルートへのアクセスも `/` へリダイレクトする

---

# 3. データモデル

## 3.1 JSDocによる型定義(`types/room.js`)

TypeScriptを使わない代わりに、JSDocコメントで型の意図を明示する。エディタの補完やAIコーディングエージェントの理解を助けるためのドキュメントとして機能する(実行時には影響しない)。

```javascript
/**
 * @typedef {"empty" | "somewhat_crowded" | "crowded"} RoomStatus
 * 表示用ラベル: empty="空", somewhat_crowded="やや混雑", crowded="混雑"
 */

/**
 * @typedef {Object} Room
 * @property {string} id              - roomId。例: "301"
 * @property {string} title           - 展示タイトル
 * @property {string} description     - 展示説明
 * @property {number} floor           - 階数(1〜5)
 * @property {string|null} imageUrl   - Storageの画像URL。未設定ならnull
 * @property {RoomStatus} status
 * @property {boolean} enabled
 * @property {import("firebase/firestore").Timestamp} updatedAt
 * @property {string} [roomName]      - 部屋名(教室番号の表示名。例: "3年1組")
 */

/**
 * @typedef {"class_admin" | "super_admin"} UserRole
 */

/**
 * @typedef {Object} AdminUser
 * @property {UserRole} role
 * @property {string} [roomId] - class_adminの場合のみ必須
 */

export {}; // このファイルをモジュールとして扱うための空export
```

> `status` はFirestore上は文字列で保存する(例:`"empty"` / `"somewhat_crowded"` / `"crowded"`)。日本語ラベル("空"/"やや混雑"/"混雑")は表示用の変換関数で持たせ、DBには英語のenum値を保存することを推奨(将来的な多言語対応や表記ゆれ防止のため)。

## 3.2 混雑状況の重みマッピング(`lib/roomStatus.js`)

```javascript
/** @type {Record<import("../types/room").RoomStatus, number>} */
export const ROOM_STATUS_ORDER = {
  empty: 0,
  somewhat_crowded: 1,
  crowded: 2,
};

/** @type {Record<import("../types/room").RoomStatus, string>} */
export const ROOM_STATUS_LABEL = {
  empty: "空",
  somewhat_crowded: "やや混雑",
  crowded: "混雑",
};

export const ROOM_STATUS_DEFAULT = "empty";
```

## 3.3 Firestoreコレクション構成

```text
users/{uid}
  role: "class_admin" | "super_admin"
  roomId: string          # class_adminの場合のみ

rooms/{roomId}
  title: string
  description: string
  floor: number
  imageUrl: string | null
  status: "empty" | "somewhat_crowded" | "crowded"
  enabled: boolean
  updatedAt: Timestamp
```

## 3.4 Storageパス構成

```text
room/{roomId}/{ランダムファイル名}.webp
```

例:`room/301/a1b2c3d4.webp`

画像更新時は新しいファイル名でアップロードし、Firestoreの`imageUrl`を更新後、旧ファイルをStorageから削除する(第8章参照)。

---

# 4. 共有ステート(全ページ共通データ取得)

## 4.1 設計方針

アプリ起動時(どのルートから入っても)に、`rooms` コレクションから `enabled == true` のドキュメントを1回だけ一括取得し、React Contextで全ページに共有する。**個別ページで追加のFirestoreクエリを発行しない。**

## 4.2 実装イメージ(`context/RoomsContext.jsx`)

```jsx
import { createContext, useContext, useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

const RoomsContext = createContext(undefined);

export function RoomsProvider({ children }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const q = query(collection(db, "rooms"), where("enabled", "==", true));
      const snap = await getDocs(q);
      setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    })();
  }, []); // マウント時に1回だけ実行

  const getRoomById = (id) => rooms.find((r) => r.id === id);

  return (
    <RoomsContext.Provider value={{ rooms, loading, getRoomById }}>
      {children}
    </RoomsContext.Provider>
  );
}

export function useRooms() {
  const ctx = useContext(RoomsContext);
  if (!ctx) throw new Error("useRooms must be used within RoomsProvider");
  return ctx;
}
```

`App.jsx` で `<RoomsProvider>` をルーティング全体の外側に配置し、全ページから `useRooms()` で参照する。

## 4.3 注意事項

* ページ再読み込み(F5)時は再度100件分のクエリが発生する仕様で問題ない(実装を複雑化させるsessionStorageキャッシュは今回は不要。第14章の試算参照)
* `loading` 中はローディング表示を出す(スケルトンでよい)

---

# 5. `/`(トップページ)の実装仕様

## 5.1 スライドショー選定ロジック

```javascript
/**
 * @param {import("../types/room").Room[]} rooms
 * @returns {import("../types/room").Room[]}
 */
function selectSlideshowRooms(rooms) {
  const emptyRooms = rooms.filter((r) => r.status === "empty");
  if (emptyRooms.length === 0) return []; // 何も表示しない
  if (emptyRooms.length <= 5) return emptyRooms;
  return shuffle(emptyRooms).slice(0, 5); // ランダムに5件抽出
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

* `emptyRooms.length === 0` の場合、スライドショー領域自体を非表示にする(親コンポーネント側で `slides.length === 0` を判定してレンダリングしない)

## 5.2 スライドショーの自動再生・手動操作

* 5秒ごとに次のスライドへ自動遷移(`setInterval` または `useEffect` + タイマー)
* 「前へ」「次へ」ボタンで手動切り替え可能にする
* 手動操作時は自動切り替えのタイマーをリセットする(操作直後にまた5秒後に自動送りされる)
* 表示形式:部屋名 / 展示タイトル / 現在の状況(第2.1章の表示例に準拠)
* スライドをクリック/タップすると `/room/:id` に遷移する

## 5.3 学校マップ

既存実装のコンポーネントをそのまま流用する。データソースは `data/mapData.json`(フロントエンドJSON、Firebaseに保存しない)。マップ上の部屋クリックで `/room/:id` に遷移する処理のみ、共有ステート(`useRooms`)と接続されていることを確認する(画像は読み込まない)。

## 5.4 「展示一覧を見る」リンク

スライドショー付近に `/rooms` へのリンクボタンを設置する。

---

# 6. `/rooms`(展示一覧ページ)の実装仕様

## 6.1 表示項目

`useRooms()` から取得した `rooms` をそのまま使用する(追加のFirestore通信なし)。各カードに以下を表示:

* 部屋名
* 階数
* 展示タイトル
* 現在の状況(バッジ等で視覚的に表示。色分け推奨:空=緑、やや混雑=黄、混雑=赤 など)

画像は表示しない。

## 6.2 ソート機能

```javascript
/**
 * @param {import("../types/room").Room[]} rooms
 * @param {"floor"|"status"} sortKey
 */
function sortRooms(rooms, sortKey) {
  if (sortKey === "floor") {
    return [...rooms].sort((a, b) => a.floor - b.floor); // 1F→5F
  }
  // status: 空 → やや混雑 → 混雑 の順
  return [...rooms].sort(
    (a, b) => ROOM_STATUS_ORDER[a.status] - ROOM_STATUS_ORDER[b.status]
  );
}
```

* 初期表示のソートキーは `"floor"`(1F→5F)
* ソート切り替えUI(タブ、セレクトボックス等)を設置する
* すべてフロントエンド側の配列操作で完結させ、Firestoreへの再取得は行わない

## 6.3 遷移

カードクリックで `/room/:id` へ遷移する。

---

# 7. `/room/:id`(部屋詳細ページ)の実装仕様

## 7.1 データ取得

```jsx
function RoomDetailPage() {
  const { id } = useParams();
  const { getRoomById, loading } = useRooms();
  const navigate = useNavigate();
  const room = getRoomById(id);

  useEffect(() => {
    if (!loading && !room) {
      navigate("/", { replace: true });
      // 任意: toast.info("その部屋は現在ご覧いただけません");
    }
  }, [loading, room]);

  if (loading) return <LoadingView />;
  if (!room) return null; // リダイレクト中

  return <RoomDetailView room={room} />;
}
```

* `room` が見つからない(存在しない/`enabled:false`)場合は `/` へリダイレクトする。追加のFirestore問い合わせは行わない
* `loading` 中(共有ステート取得中)は判定を保留し、誤って一瞬でもリダイレクトしないようにする

## 7.2 画像取得

* `room.imageUrl` を `<img src={room.imageUrl} />` として表示するだけでよい(Firebase StorageのダウンロードURLはHTTPS URLであり、ブラウザの通常の画像リクエスト・キャッシュ機構がそのまま使える)
* `imageUrl` が `null`(未設定)の場合はプレースホルダー画像を表示する
* 追加のAPI呼び出しは不要(URLを直接imgタグに渡すだけで、ブラウザキャッシュも自動的に効く)

## 7.3 表示項目

部屋名・展示タイトル・展示説明・展示場所・現在の状況・写真・最終更新日時(`updatedAt`をフォーマットして表示)。

---

# 8. `/admin`(管理画面)の実装仕様

## 8.1 ログイン

### UI

入力項目は以下の2つのみ(メールアドレスという表現は一切使わない)。

* ユーザー名(教室番号。例:`301`)
* パスワード

### 内部処理(`lib/auth.js`)

```javascript
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

const DUMMY_EMAIL_DOMAIN = "bunkasai.local";

/** @param {string} username */
export function usernameToEmail(username) {
  return `${username}@${DUMMY_EMAIL_DOMAIN}`;
}

/**
 * @param {string} username
 * @param {string} password
 */
export async function loginWithUsername(username, password) {
  const email = usernameToEmail(username);
  return signInWithEmailAndPassword(auth, email, password);
}
```

* スーパー管理者も同じログインフォームを使う想定でよい(スーパー管理者用のユーザー名は運用側で決める。例:`admin`)。ただしスーパー管理者は実メールアドレスで作成する場合(第10章参照)、その実メールアドレスをそのまま「ユーザー名」欄に入力させる形にしても矛盾しない(`usernameToEmail`はダミードメイン付与用なので、スーパー管理者ログイン時は素のメールアドレスを直接使う分岐を用意するか、運用上はスーパー管理者にも教室番号的なID+ダミードメインを割り振ってもよい。**要:実装時にどちらの方式にするか確認**)

### ログイン後の権限判定

```jsx
async function afterLogin(uid) {
  const userDoc = await getDoc(doc(db, "users", uid));
  const userData = userDoc.data(); // { role, roomId? }
  if (userData.role === "class_admin") {
    // ClassAdminPage へ、userData.roomId を渡す
  } else if (userData.role === "super_admin") {
    // SuperAdminPage へ
  }
}
```

## 8.2 クラス管理者画面

* 自分の `roomId` の部屋データのみを編集フォームで表示・更新できる
* 編集可能項目:展示タイトル、展示説明、現在の状況(セレクトボックス、3択:空/やや混雑/混雑)、写真
* 他の部屋のデータは取得・表示しない(UIレベルでも他roomIdへのアクセス導線を作らない。Security Rulesでも第9章のとおり制限)
* 更新処理:
  1. フォーム送信時、Firestoreの `rooms/{roomId}` ドキュメントを `updateDoc` で更新(`updatedAt` は `serverTimestamp()` を使用)
  2. 写真が変更された場合は第8.4章の画像アップロード処理を先に実行し、新しい `imageUrl` を取得してから同じ更新に含める

## 8.3 スーパー管理者画面

* 全部屋の一覧表示(検索・フィルタ可能だと尚良いが必須ではない)
* 任意の部屋を選択して編集(クラス管理者と同じ編集フォームを再利用できる設計にする)
* `enabled` の切り替えUI(トグルスイッチ等)
* 写真の削除機能(Storageから削除 + Firestoreの`imageUrl`を`null`に更新)

## 8.4 画像アップロード処理(`lib/imageUpload.js`)

```javascript
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  fileType: "image/webp",
};

/**
 * @param {string} roomId
 * @param {File} file
 * @param {string|null} previousImageUrl
 * @returns {Promise<string>} 新しい画像のダウンロードURL
 */
export async function uploadRoomImage(roomId, file, previousImageUrl) {
  // 1. クライアント側で圧縮
  const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);

  // 2. 新しいファイル名でアップロード(上書きしない)
  const fileName = `${crypto.randomUUID()}.webp`;
  const storageRef = ref(storage, `room/${roomId}/${fileName}`);
  await uploadBytes(storageRef, compressedFile);
  const newImageUrl = await getDownloadURL(storageRef);

  // 3. 旧画像を削除(存在する場合のみ。失敗してもアップロード自体は成功させる)
  if (previousImageUrl) {
    try {
      const oldRef = ref(storage, previousImageUrl); // URLからRefを復元
      await deleteObject(oldRef);
    } catch (e) {
      console.warn("旧画像の削除に失敗しました(孤立ファイルとして残ります)", e);
    }
  }

  return newImageUrl;
}
```

* 圧縮後もStorage Security Rules側で2MB上限をチェックする(第9章参照。クライアント処理をバイパスされた場合の防御)
* アップロード失敗時はエラーメッセージを表示し、Firestore側の更新は行わない(整合性を保つため、Storageアップロード成功後にFirestore更新を行う順序を守る)

---

# 9. Firebase Security Rules

## 9.1 Firestore Security Rules(`firestore.rules`)

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function userDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isSuperAdmin() {
      return isSignedIn() && userDoc().role == "super_admin";
    }

    function isClassAdminOf(roomId) {
      return isSignedIn()
        && userDoc().role == "class_admin"
        && userDoc().roomId == roomId;
    }

    match /users/{uid} {
      // 自分自身の権限確認のみ許可。書き込みはクライアントから行わない(Admin SDK経由のみ)
      allow read: if isSignedIn() && request.auth.uid == uid;
      allow write: if false;
    }

    match /rooms/{roomId} {
      // 一般来場者:enabled:true の部屋のみ読み取り可能
      allow read: if resource.data.enabled == true
        || isSuperAdmin()
        || isClassAdminOf(roomId);

      // 更新:自分の部屋のみ(class_admin)、または全部屋(super_admin)
      allow update: if isSuperAdmin() || isClassAdminOf(roomId);

      // 作成・削除はクライアントから行わない(事前にAdmin SDK等で全部屋分を作成しておく運用)
      allow create, delete: if isSuperAdmin();
    }
  }
}
```

> 補足:`allow read` に `enabled:false` の部屋を管理者にも見せる条件を入れているのは、スーパー管理者・当該クラス管理者が無効化した自分の部屋を管理画面で確認・再編集できるようにするため。一般来場者向けのクエリ(`where("enabled","==",true)`)自体が `enabled:false` の部屋を取得しないため、実質的に一般来場者からは見えない。

## 9.2 Storage Security Rules(`storage.rules`)

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function isSignedIn() {
      return request.auth != null;
    }

    function userRoomId() {
      return firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.roomId;
    }

    function userRole() {
      return firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role;
    }

    match /room/{roomId}/{fileName} {
      // 読み取りは一般公開
      allow read: if true;

      // 書き込み:自分の部屋のみ(class_admin)、または全部屋(super_admin)
      // ファイルサイズ2MB以下・画像形式(webp/jpeg)のみ許可
      allow write: if isSignedIn()
        && (userRole() == "super_admin" || userRoomId() == roomId)
        && request.resource.size <= 2 * 1024 * 1024
        && request.resource.contentType.matches('image/(webp|jpeg)');
    }
  }
}
```

> Storage RulesからFirestoreを参照する `firestore.get()` の構文はSDKバージョンにより異なる場合があるため、実装時に最新のFirebase公式ドキュメントの構文を確認すること。

---

# 10. アカウント一括作成スクリプト

## 10.1 概要

Firebase Admin SDKを使ったNode.jsスクリプトを **開発者のローカル環境またはCI等の信頼できる環境でのみ実行する**(Vercel上のクライアントコードには絶対に含めない)。

## 10.2 実装イメージ(`scripts/createAccounts.js`)

```javascript
import admin from "firebase-admin";
import { randomBytes } from "crypto";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const DUMMY_EMAIL_DOMAIN = "bunkasai.local";

function generatePassword() {
  return randomBytes(6).toString("base64url"); // 推測されにくいランダム文字列
}

/**
 * @param {string[]} roomIds
 */
async function createClassAdminAccounts(roomIds) {
  const results = [];

  for (const roomId of roomIds) {
    const email = `${roomId}@${DUMMY_EMAIL_DOMAIN}`;
    const password = generatePassword();

    const userRecord = await admin.auth().createUser({ email, password });

    await admin.firestore().collection("users").doc(userRecord.uid).set({
      role: "class_admin",
      roomId,
    });

    await admin.firestore().collection("rooms").doc(roomId).set({
      title: "",
      description: "",
      floor: Number(roomId[0]), // roomId命名規則に応じて調整
      imageUrl: null,
      status: "empty",
      enabled: false, // 初期状態は非公開。運営側が展示準備完了後にtrueへ切り替える
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    results.push({ roomId, password });
  }

  return results; // CSV等に出力し、各クラスへ配布する
}
```

* `roomIds` の配列は、実際に使用する約100部屋分のリストを事前に用意する(全196部屋のうち使う部屋のみ)
* 生成したパスワード一覧はCSV等に出力し、印刷して各クラスに配布する運用を想定(配布方法自体は運用マニュアル側の話であり、本書のスコープ外)
* スーパー管理者アカウントはこのスクリプトの対象に含めない。Firebase Consoleから個別に手動作成する

---

# 11. Firebase初期化・環境変数

## 11.1 `lib/firebase.js`

```javascript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// App Check(reCAPTCHA v3等のキーは運用側が手動取得・設定する。第0章参照)
if (import.meta.env.VITE_APPCHECK_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_APPCHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}
```

## 11.2 環境変数(Vercel設定)

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_APPCHECK_SITE_KEY   # App Check手動設定後に発行されるキー
```

Admin SDKのサービスアカウントキー(`serviceAccountKey.json`)はVercel環境変数・リポジトリに含めない。アカウント一括作成スクリプト実行時のみローカルに配置する。

---

# 12. 実装順序の推奨

1. Firebaseプロジェクト作成(Blazeプラン化、Firestore/Storage/Authentication有効化)
2. `firestore.rules` / `storage.rules` を実装・デプロイ
3. `lib/firebase.js` でSDK初期化(App Check連携は後回しでも可)
4. JSDoc型定義(`types/room.js`)、`RoomsContext` を実装
5. `/`・`/rooms`・`/room/:id` の一般利用者向けページを実装(この時点ではFirestoreに手動でテストデータを数件投入して動作確認)
6. 学校マップの既存実装を移植・接続
7. `/admin` のログインUI・権限判定・クラス管理者編集画面を実装
8. 画像アップロード処理(`browser-image-compression` + Storage連携)を実装
9. スーパー管理者画面を実装
10. アカウント一括作成スクリプト(Admin SDK)を実装し、実データ(約100部屋分)を投入
11. App Check導入(reCAPTCHA v3キー取得・設定は運用側が手動で行う。コード側の組み込みのみ対応)
12. 全体の動作確認・Firestore/Storageの読み取り/転送量の実測確認(第14章の試算との比較)

---

# 13. スコープ外(本書では扱わない事項)

* App Checkの具体的なキー取得・Firebase Console側の設定手順(運用側が手動対応)
* パスワード紛失時の運用フロー(仕様として機能を設けないことのみ確定。運用マニュアルは別途)
* Vercelへのデプロイ設定の詳細手順
* 学校マップの実装そのもの(既存実装を流用する前提)
