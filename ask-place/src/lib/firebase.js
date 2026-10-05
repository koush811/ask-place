import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const configKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_APPCHECK_SITE_KEY",
];

const missingConfigKeys = configKeys.filter((key) => !import.meta.env[key]);
if (missingConfigKeys.length > 0) {
  throw new Error(`Firebase設定が不足しています: ${missingConfigKeys.join(", ")}`);
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firebaseサービスを利用する前にApp Checkを初期化して、各リクエストへトークンを付与する。
if (typeof window !== "undefined") {
  try {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;

    console.log("[App Check] 初期化開始");

    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_APPCHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });

    console.log("[App Check] 初期化完了");
  } catch (error) {
    console.error("[Firebase App Check] 初期化エラー:", error);
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export function isTrustedStorageUrl(value) {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "firebasestorage.googleapis.com" ||
        url.hostname.endsWith(".firebasestorage.app"))
    );
  } catch {
    return false;
  }
}

