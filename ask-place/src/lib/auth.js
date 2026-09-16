import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const DUMMY_EMAIL_DOMAIN = "bunkasai.local";

/**
 * ユーザー名（教室番号等）をFirebase認証用のメールアドレスに変換
 * メールアドレス形式（@を含む）が直接入力された場合はそのまま使用（スーパー管理者対応）
 * @param {string} username
 * @returns {string}
 */
export function usernameToEmail(username) {
  const trimmed = username.trim();
  if (trimmed.includes("@")) {
    return trimmed;
  }
  return `${trimmed}@${DUMMY_EMAIL_DOMAIN}`;
}

/**
 * ユーザー名とパスワードによるログイン
 * @param {string} username - 教室番号（例: "301"）またはスーパー管理者ID
 * @param {string} password - パスワード
 * @returns {Promise<import("firebase/auth").UserCredential>}
 */
export async function loginWithUsername(username, password) {
  const email = usernameToEmail(username);
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * ログイン中ユーザーの権限および割り当て部屋情報を取得
 * @param {string} uid - Firebase AuthのUID
 * @returns {Promise<import("../types/room").AdminUser | null>}
 */
export async function getUserRole(uid) {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) {
    return null;
  }
  return /** @type {import("../types/room").AdminUser} */ (userDoc.data());
}

/**
 * ログアウト
 * @returns {Promise<void>}
 */
export async function logout() {
  return signOut(auth);
}
