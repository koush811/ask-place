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
 * 部屋の展示画像を圧縮し、Firebase Storageへアップロードする
 * 以前の画像が存在する場合は削除を試みる
 * @param {string} roomId - 部屋ID (例: "301")
 * @param {File} file - アップロードする画像ファイル
 * @param {string|null} [previousImageUrl] - 更新前の画像URL (存在する場合)
 * @returns {Promise<string>} 新しい画像のダウンロードURL
 */
export async function uploadRoomImage(roomId, file, previousImageUrl = null) {
  // 1. クライアント側で圧縮 (最大1MB, 長辺1600px, WebP形式)
  const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);

  // 2. 新しいユニークファイル名でアップロード (上書きキャッシュ問題を防止)
  const uniqueId = typeof crypto.randomUUID === "function" 
    ? crypto.randomUUID() 
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  const fileName = `${uniqueId}.webp`;
  const storageRef = ref(storage, `room/${roomId}/${fileName}`);

  await uploadBytes(storageRef, compressedFile, {
    contentType: "image/webp",
  });
  const newImageUrl = await getDownloadURL(storageRef);

  // 3. 旧画像が存在する場合は削除 (失敗しても新画像アップロードは成功扱いとする)
  if (previousImageUrl) {
    try {
      const oldRef = ref(storage, previousImageUrl);
      await deleteObject(oldRef);
    } catch (e) {
      console.warn("[Storage] 旧画像の削除に失敗しました (孤立ファイルとして残ります):", e);
    }
  }

  return newImageUrl;
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
