import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

const MAX_UPLOAD_BYTES = 500 * 1024;
const RESIZE_DIMENSIONS = [1600, 1280, 1024, 800, 640];

async function resizeAndCompressImage(file) {
  let output;
  for (const maxWidthOrHeight of RESIZE_DIMENSIONS) {
    output = await imageCompression(file, {
      maxSizeMB: 0.45,
      maxWidthOrHeight,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.82,
      maxIteration: 10,
    });
    if (output.size <= MAX_UPLOAD_BYTES) return output;
  }
  return output;
}

/**
 * 部屋の展示画像を圧縮し、Firebase Storageへアップロードする
 * Firestore側の保存が完了するまで、以前の画像は削除しない
 * @param {string} roomId - 部屋ID (例: "301")
 * @param {File} file - アップロードする画像ファイル
 * @returns {Promise<string>} 新しい画像のダウンロードURL
 */
export async function uploadRoomImage(roomId, file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選択してください。");
  }

  let compressedFile;
  try {
    compressedFile = await resizeAndCompressImage(file);
  } catch (error) {
    throw new Error(`画像の圧縮に失敗しました: ${error?.message || "この画像形式を読み込めません"}`);
  }

  const allowedTypes = ["image/webp", "image/jpeg"];
  if (!allowedTypes.includes(compressedFile.type)) {
    throw new Error(`圧縮後の画像形式 ${compressedFile.type || "不明"} はアップロードできません。JPEGまたはPNG画像を選び直してください。`);
  }
  if (compressedFile.size > MAX_UPLOAD_BYTES) {
    throw new Error("画像を自動縮小しましたが500KB以下になりませんでした。別の画像を選んでください。");
  }

  // 2. 新しいユニークファイル名でアップロード (上書きキャッシュ問題を防止)
  const uniqueId = typeof crypto.randomUUID === "function" 
    ? crypto.randomUUID() 
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  const extension = compressedFile.type === "image/webp" ? "webp" : "jpeg";
  const fileName = `${uniqueId}.${extension}`;
  const storageRef = ref(storage, `room/${roomId}/${fileName}`);

  try {
    await uploadBytes(storageRef, compressedFile, {
      contentType: compressedFile.type,
    });
    return await getDownloadURL(storageRef);
  } catch (error) {
    throw new Error(`Firebase Storageへの画像保存に失敗しました (${error?.code || "unknown"}): ${error?.message || "通信または権限を確認してください"}`);
  }
}

/**
 * 画像の削除処理 (Storageからファイルを削除)
 * @param {string} imageUrl - 削除対象の画像URL
 * @returns {Promise<void>}
 */
export async function deleteRoomImage(imageUrl) {
  if (!imageUrl) return;
  try {
    const targetRef = ref(storage, imageUrl);
    await deleteObject(targetRef);
  } catch (e) {
    console.warn("[Storage] 画像の削除に失敗しました:", e);
    throw e;
  }
}
