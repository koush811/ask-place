import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { uploadRoomImage } from "../../lib/imageUpload";
import { ROOM_STATUS_LABEL } from "../../lib/roomStatus";

/**
 * クラス管理者画面 (/admin - class_admin ログイン後) - 仕様書 第8.2章
 * @param {{
 *   user: { uid: string, role: "class_admin", roomId: string },
 *   onLogout: () => void
 * }} props
 */
export default function ClassAdminPage({ user, onLogout }) {
  const roomId = user?.roomId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: "", isError: false });

  // 編集フォーム状態
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("empty");
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // 担当教室データの取得 (仕様書: 自分のroomIdのみ)
  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      setStatusMsg({ text: "担当部屋が割り当てられていません。", isError: true });
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const roomDoc = await getDoc(doc(db, "rooms", roomId));
        if (roomDoc.exists()) {
          const data = roomDoc.data();
          if (isMounted) {
            setTitle(data.title || "");
            setDescription(data.description || "");
            setStatus(data.status || "empty");
            setCurrentImageUrl(data.imageUrl || null);
          }
        }
      } catch (err) {
        console.error("[ClassAdmin] データ読み込み失敗:", err);
        if (isMounted) {
          setStatusMsg({ text: "部屋データの読み込みに失敗しました。", isError: true });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  // 画像ファイル選択時のプレビュー生成
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const objUrl = URL.createObjectURL(file);
      setPreviewUrl(objUrl);
    }
  };

  // 保存処理 (仕様書 第8.2章・第8.4章)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomId) return;

    setSaving(true);
    setStatusMsg({ text: "", isError: false });

    try {
      let finalImageUrl = currentImageUrl;

      // 1. 新しい写真がある場合、先に圧縮・アップロードを行う
      if (selectedFile) {
        setStatusMsg({ text: "写真を圧縮・アップロード中...", isError: false });
        finalImageUrl = await uploadRoomImage(roomId, selectedFile, currentImageUrl);
      }

      // 2. Firestore を updateDoc で更新 (updatedAt は serverTimestamp())
      setStatusMsg({ text: "展示情報を更新中...", isError: false });
      const roomRef = doc(db, "rooms", roomId);
      await updateDoc(roomRef, {
        title: title.trim(),
        description: description.trim(),
        status: status,
        imageUrl: finalImageUrl,
        updatedAt: serverTimestamp(),
      });

      setCurrentImageUrl(finalImageUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      setStatusMsg({ text: "✨ 正常に保存されました！", isError: false });
    } catch (err) {
      console.error("[ClassAdmin] 更新失敗:", err);
      setStatusMsg({
        text: "保存に失敗しました。画像サイズや通信環境をご確認ください。",
        isError: true,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>担当教室の情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <header className="admin-page-header">
        <div>
          <span className="admin-role-badge">クラス管理者</span>
          <h1 className="admin-page-title">
            {roomId} 教室 展示管理
          </h1>
        </div>
        <button type="button" className="admin-logout-btn" onClick={onLogout}>
          ログアウト
        </button>
      </header>

      {statusMsg.text && (
        <div
          className={`admin-status-message ${
            statusMsg.isError ? "error" : "success"
          }`}
          role="status"
        >
          {statusMsg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-edit-form">
        {/* 展示タイトル */}
        <div className="form-field">
          <label htmlFor="room-title">展示・企画タイトル <span className="req">*</span></label>
          <input
            id="room-title"
            type="text"
            className="admin-input"
            placeholder="例: お化け屋敷 / 迷宮の館"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving}
            required
          />
        </div>

        {/* 混雑状況 (3択セレクトボックス) */}
        <div className="form-field">
          <label htmlFor="room-status">現在の混雑状況 <span className="req">*</span></label>
          <select
            id="room-status"
            className="admin-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={saving}
          >
            <option value="empty">🟢 {ROOM_STATUS_LABEL.empty} (すぐに入場できます)</option>
            <option value="somewhat_crowded">🟡 {ROOM_STATUS_LABEL.somewhat_crowded} (少し待つ可能性があります)</option>
            <option value="crowded">🔴 {ROOM_STATUS_LABEL.crowded} (現在混み合っています)</option>
          </select>
          <span className="input-hint">
            ※混雑状況をこまめに更新することで、来場者の混雑緩和につながります
          </span>
        </div>

        {/* 展示説明 */}
        <div className="form-field">
          <label htmlFor="room-desc">展示説明文</label>
          <textarea
            id="room-desc"
            className="admin-textarea"
            rows={5}
            maxLength={1000}
            placeholder="来場者に向けた企画の紹介や見どころを入力してください"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
        </div>

        {/* 展示写真 */}
        <div className="form-field">
          <label htmlFor="room-photo">展示写真 (1枚のみ登録可)</label>
          
          <div className="photo-preview-container">
            {previewUrl ? (
              <div className="photo-preview-wrap">
                <img src={previewUrl} alt="プレビュー" className="photo-preview" />
                <span className="photo-preview-tag">新しく選択された画像</span>
              </div>
            ) : currentImageUrl ? (
              <div className="photo-preview-wrap">
                <img src={currentImageUrl} alt="現在の展示写真" className="photo-preview" />
                <span className="photo-preview-tag">現在公開中の画像</span>
              </div>
            ) : (
              <div className="photo-placeholder">写真はまだ登録されていません</div>
            )}
          </div>

          <input
            id="room-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="admin-file-input"
            onChange={handleFileChange}
            disabled={saving}
          />
          <span className="input-hint">
            ※ アップロード時に自動で軽量化 (WebP形式 / 1MB以下) に圧縮されます
          </span>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="admin-submit-btn"
            disabled={saving}
          >
            {saving ? "保存中..." : "展示情報を保存する"}
          </button>
        </div>
      </form>
    </div>
  );
}
