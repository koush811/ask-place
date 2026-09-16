/**
 * クラス管理者アカウント・初期Firestoreデータ 一括作成スクリプト
 * 
 * 【実行方法】
 * 1. Firebase Console > プロジェクト設定 > サービスアカウント から秘密鍵 (JSON) を生成し、
 *    本スクリプトと同じディレクトリ (scripts/) に `serviceAccountKey.json` という名前で配置してください。
 * 2. `npm install firebase-admin` (スクリプト実行環境に必要)
 * 3. `node scripts/createAccounts.js` を実行
 * 4. 実行後、`scripts/generated_accounts.csv` に教室番号と初期パスワードが出力されます。
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_ACCOUNT_PATH = path.join(__dirname, "serviceAccountKey.json");
const OUTPUT_CSV_PATH = path.join(__dirname, "generated_accounts.csv");
const DUMMY_EMAIL_DOMAIN = "bunkasai.local";

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error("【エラー】serviceAccountKey.json が見つかりません。");
  console.error("Firebase Console から秘密鍵をダウンロードして scripts/serviceAccountKey.json に配置してください。");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));

const app = initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth(app);
const db = getFirestore(app);

/**
 * 推測されにくいランダムパスワードを生成 (8〜10文字程度)
 * @returns {string}
 */
function generatePassword() {
  return randomBytes(6).toString("base64url");
}

/**
 * 部屋番号から階数を推定する (例: "301" -> 3, "S402" -> 4, "F201" -> 2)
 * @param {string} roomId
 * @returns {number}
 */
function extractFloor(roomId) {
  const match = roomId.match(/(\d)/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * クラス管理者アカウントとFirestore初期ドキュメントを一括作成
 * @param {string[]} roomIds
 */
async function createClassAdminAccounts(roomIds) {
  console.log(`アカウント作成を開始します (対象: ${roomIds.length} 部屋)...`);
  const results = [];

  for (let i = 0; i < roomIds.length; i++) {
    const item = roomIds[i];
    const roomId = typeof item === "string" ? item : item.roomId;
    const floor = typeof item === "object" && item.floor ? item.floor : extractFloor(roomId);
    const email = `${roomId}@${DUMMY_EMAIL_DOMAIN}`;
    const password = generatePassword();

    try {
      // 1. Firebase Auth ユーザー作成 (既存ユーザーチェック)
      let uid;
      try {
        const existingUser = await auth.getUserByEmail(email);
        uid = existingUser.uid;
        // パスワードを更新
        await auth.updateUser(uid, { password });
        console.log(`[${i + 1}/${roomIds.length}] 既存ユーザーのパスワードを更新: ${roomId} (${email})`);
      } catch (err) {
        if (err.code === "auth/user-not-found") {
          const userRecord = await auth.createUser({ email, password });
          uid = userRecord.uid;
          console.log(`[${i + 1}/${roomIds.length}] 新規ユーザー作成: ${roomId} (${email})`);
        } else {
          throw err;
        }
      }

      // 2. Firestore: users/{uid} を作成
      await db.collection("users").doc(uid).set({
        role: "class_admin",
        roomId: roomId,
      }, { merge: true });

      // 3. Firestore: rooms/{roomId} 初期ドキュメントを作成（既存データがある場合は初期化で上書きしないよう保護）
      const roomDocRef = db.collection("rooms").doc(roomId);
      const roomDocSnap = await roomDocRef.get();
      if (!roomDocSnap.exists) {
        await roomDocRef.set({
          title: "",
          description: "",
          floor: floor,
          imageUrl: null,
          status: "empty",
          enabled: false, // 初期状態は非公開
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        await roomDocRef.set({ floor }, { merge: true });
      }

      results.push({ roomId, email, password });
    } catch (err) {
      console.error(`[${roomId}] の作成に失敗しました:`, err);
    }
  }

  // 4. CSV 出力
  const csvContent = [
    "roomId,email,password",
    ...results.map((r) => `"${r.roomId}","${r.email}","${r.password}"`),
  ].join("\n");

  fs.writeFileSync(OUTPUT_CSV_PATH, csvContent, "utf-8");
  console.log(`\n完了: ${results.length} 件のアカウントを作成/更新しました。`);
  console.log(`パスワード一覧を保存しました: ${OUTPUT_CSV_PATH}`);
}

/**
 * campus_map_data.json から "type": "room" の部屋ノードを抽出・重複排除して取得
 * @returns {{ roomId: string, floor: number }[]}
 */
function loadRoomsFromMapData() {
  const mapDataPath = path.join(__dirname, "../src/data/campus_map_data.json");
  const mapData = JSON.parse(fs.readFileSync(mapDataPath, "utf-8"));
  const roomNodes = (mapData.nodes || []).filter((n) => n.type === "room");

  const roomMap = new Map();
  roomNodes.forEach((n) => {
    if (!roomMap.has(n.name)) {
      const floorMatch = n.floor ? n.floor.match(/(\d)/) : n.name.match(/(\d)/);
      const floor = floorMatch ? parseInt(floorMatch[1], 10) : 1;
      roomMap.set(n.name, { roomId: n.name, floor });
    }
  });

  // 階数・部屋番号順にソート
  return Array.from(roomMap.values()).sort(
    (a, b) => a.floor - b.floor || a.roomId.localeCompare(b.roomId, undefined, { numeric: true })
  );
}

// コマンドライン引数で個別指定があればそれを使用、無ければ campus_map_data.json の部屋一覧を使用
let targetRooms = [];
if (process.argv.slice(2).length > 0) {
  targetRooms = process.argv.slice(2).map((id) => ({
    roomId: id,
    floor: extractFloor(id),
  }));
} else {
  targetRooms = loadRoomsFromMapData();
}

console.log(`対象部屋数: ${targetRooms.length} 部屋`);

createClassAdminAccounts(targetRooms)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("スクリプト実行エラー:", err);
    process.exit(1);
  });
