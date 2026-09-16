import { useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { uploadRoomImage, deleteRoomImage } from "../../lib/imageUpload";
import { ROOM_STATUS_LABEL } from "../../lib/roomStatus";
import StatusBadge from "../../components/StatusBadge";

/**
 * スーパー管理者画面 (/admin - super_admin ログイン後) - 仕様書 第8.3章
 * @param {{
 *   user: { uid: string, role: "super_admin" },
 *   onLogout: () => void
 * }} props
 */
export default function SuperAdminPage({ user, onLogout }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ text: "", isError: false });

  // 検索・フィルタ状態
  const [filterFloor, setFilterFloor] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // 編集フォーム状態
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState("empty");
  const [editFloor, setEditFloor] = useState(1);
  const [editEnabled, setEditEnabled] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // 全部屋一覧の取得 (スーパー管理者権限)
  const fetchAllRooms = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "rooms"));
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      // 階数・ID順にソート
      list.sort((a, b) => (a.floor || 0) - (b.floor || 0) || a.id.localeCompare(b.id));
      setRooms(list);
    } catch (err) {
      console.error("[SuperAdmin] 部屋一覧取得失敗:", err);
      setStatusMsg({ text: "全部屋データの取得に失敗しました。", isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRooms();
  }, []);

  // 選択中の部屋データをフォームに反映
  const selectRoomForEdit = (room) => {
    setSelectedRoomId(room.id);
    setEditTitle(room.title || "");
    setEditDesc(room.description || "");
    setEditStatus(room.status || "empty");
    setEditFloor(room.floor || 1);
    setEditEnabled(room.enabled ?? false);
    setCurrentImageUrl(room.imageUrl || null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setStatusMsg({ text: "", isError: false });
  };

  // enabled (公開/非公開) のワンクリックトグル切り替え
  const handleToggleEnabled = async (room, e) => {
    e.stopPropagation();
    const newEnabled = !room.enabled;
    try {
      await updateDoc(doc(db, "rooms", room.id), {
        enabled: newEnabled,
        updatedAt: serverTimestamp(),
      });
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, enabled: newEnabled } : r))
      );
      if (selectedRoomId === room.id) {
        setEditEnabled(newEnabled);
      }
    } catch (err) {
      console.error("[SuperAdmin] enabled切り替え失敗:", err);
      alert("公開ステータスの更新に失敗しました。");
    }
  };

  // 画像ファイル選択
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // 写真の削除処理 (仕様書 第8.3章)
  const handleDeletePhoto = async () => {
    if (!currentImageUrl || !selectedRoomId) return;
    if (!window.confirm("この展示の写真を削除してよろしいですか？")) return;

    setSaving(true);
    setStatusMsg({ text: "写真を削除中...", isError: false });
    try {
      await deleteRoomImage(currentImageUrl);
      await updateDoc(doc(db, "rooms", selectedRoomId), {
        imageUrl: null,
        updatedAt: serverTimestamp(),
      });
      setCurrentImageUrl(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      setRooms((prev) =>
        prev.map((r) => (r.id === selectedRoomId ? { ...r, imageUrl: null } : r))
      );
      setStatusMsg({ text: "写真を正常に削除しました。", isError: false });
    } catch (err) {
      console.error("[SuperAdmin] 写真削除失敗:", err);
      setStatusMsg({ text: "写真の削除に失敗しました。", isError: true });
    } finally {
      setSaving(false);
    }
  };

  // 編集フォーム送信
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoomId) return;

    setSaving(true);
    setStatusMsg({ text: "", isError: false });

    try {
      let finalImageUrl = currentImageUrl;

      // 新規写真アップロード
      if (selectedFile) {
        setStatusMsg({ text: "写真をアップロード中...", isError: false });
        finalImageUrl = await uploadRoomImage(selectedRoomId, selectedFile, currentImageUrl);
      }

      setStatusMsg({ text: "部屋情報を更新中...", isError: false });
      const roomRef = doc(db, "rooms", selectedRoomId);
      await updateDoc(roomRef, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        status: editStatus,
        floor: Number(editFloor),
        enabled: editEnabled,
        imageUrl: finalImageUrl,
        updatedAt: serverTimestamp(),
      });

      // ローカル一覧の更新
      setRooms((prev) =>
        prev.map((r) =>
          r.id === selectedRoomId
            ? {
                ...r,
                title: editTitle.trim(),
                description: editDesc.trim(),
                status: editStatus,
                floor: Number(editFloor),
                enabled: editEnabled,
                imageUrl: finalImageUrl,
              }
            : r
        )
      );

      setCurrentImageUrl(finalImageUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      setStatusMsg({ text: `✨ [${selectedRoomId}] を保存しました！`, isError: false });
    } catch (err) {
      console.error("[SuperAdmin] 保存失敗:", err);
      setStatusMsg({ text: "保存に失敗しました。", isError: true });
    } finally {
      setSaving(false);
    }
  };

  // フィルタ済み部屋一覧
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchFloor = filterFloor === "all" || r.floor === Number(filterFloor);
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        r.id.toLowerCase().includes(q) ||
        (r.title && r.title.toLowerCase().includes(q));
      return matchFloor && matchQuery;
    });
  }, [rooms, filterFloor, searchQuery]);

  return (
    <div className="admin-page-container super-admin">
      <header className="admin-page-header">
        <div>
          <span className="admin-role-badge super">統括 / スーパー管理者</span>
          <h1 className="admin-page-title">文化祭 全体管理画面</h1>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-secondary" onClick={fetchAllRooms}>
            🔄 一覧を再取得
          </button>
          <button type="button" className="admin-logout-btn" onClick={onLogout}>
            ログアウト
          </button>
        </div>
      </header>

      {statusMsg.text && (
        <div
          className={`admin-status-message ${statusMsg.isError ? "error" : "success"}`}
          role="status"
        >
          {statusMsg.text}
        </div>
      )}

      <div className="super-admin-layout">
        {/* 左カラム: 全部屋リスト */}
        <section className="room-manager-sidebar">
          <div className="sidebar-filter-box">
            <input
              type="text"
              className="admin-input"
              placeholder="部屋番号やタイトルで絞り込み..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="admin-select"
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
            >
              <option value="all">全フロア ({rooms.length}室)</option>
              <option value="1">1F</option>
              <option value="2">2F</option>
              <option value="3">3F</option>
              <option value="4">4F</option>
              <option value="5">5F</option>
            </select>
          </div>

          <div className="room-items-scroll">
            {loading ? (
              <div className="loading-state">読み込み中...</div>
            ) : filteredRooms.length === 0 ? (
              <div className="empty-state">該当する部屋がありません</div>
            ) : (
              filteredRooms.map((r) => (
                <div
                  key={r.id}
                  className={`room-table-row ${selectedRoomId === r.id ? "selected" : ""}`}
                  onClick={() => selectRoomForEdit(r)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="row-left">
                    <span className="room-code">{r.id}</span>
                    <span className="room-title-snippet">
                      {r.title || "(展示未登録)"}
                    </span>
                  </div>
                  <div className="row-right">
                    <StatusBadge status={r.status || "empty"} size="sm" />
                    <button
                      type="button"
                      className={`toggle-enabled-btn ${r.enabled ? "enabled" : "disabled"}`}
                      onClick={(e) => handleToggleEnabled(r, e)}
                      title={r.enabled ? "公開中 (クリックで非公開へ)" : "非公開 (クリックで公開へ)"}
                    >
                      {r.enabled ? "公開中" : "非公開"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 右カラム: 選択した部屋の編集フォーム */}
        <section className="room-edit-panel">
          {selectedRoomId ? (
            <form onSubmit={handleFormSubmit} className="admin-edit-form">
              <div className="panel-header">
                <h2>部屋情報編集: <span className="highlight">{selectedRoomId}</span></h2>
                <label className="toggle-switch-label">
                  <input
                    type="checkbox"
                    checked={editEnabled}
                    onChange={(e) => setEditEnabled(e.target.checked)}
                  />
                  <span>一般サイトへ公開する (enabled)</span>
                </label>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="sa-floor">階数</label>
                  <input
                    id="sa-floor"
                    type="number"
                    min={1}
                    max={5}
                    className="admin-input"
                    value={editFloor}
                    onChange={(e) => setEditFloor(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="sa-status">混雑状況</label>
                  <select
                    id="sa-status"
                    className="admin-select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="empty">🟢 {ROOM_STATUS_LABEL.empty}</option>
                    <option value="somewhat_crowded">🟡 {ROOM_STATUS_LABEL.somewhat_crowded}</option>
                    <option value="crowded">🔴 {ROOM_STATUS_LABEL.crowded}</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="sa-title">展示タイトル</label>
                <input
                  id="sa-title"
                  type="text"
                  className="admin-input"
                  placeholder="展示タイトル"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="sa-desc">展示説明文</label>
                <textarea
                  id="sa-desc"
                  className="admin-textarea"
                  rows={4}
                  placeholder="展示説明文"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>

              {/* 写真エリア */}
              <div className="form-field">
                <label>展示写真</label>
                <div className="photo-preview-container">
                  {previewUrl ? (
                    <div className="photo-preview-wrap">
                      <img src={previewUrl} alt="新画像プレビュー" className="photo-preview" />
                      <span className="photo-preview-tag">新しい写真</span>
                    </div>
                  ) : currentImageUrl ? (
                    <div className="photo-preview-wrap">
                      <img src={currentImageUrl} alt="公開中の写真" className="photo-preview" />
                      <button
                        type="button"
                        className="delete-photo-btn"
                        onClick={handleDeletePhoto}
                        disabled={saving}
                      >
                        🗑️ 写真を削除
                      </button>
                    </div>
                  ) : (
                    <div className="photo-placeholder">写真は登録されていません</div>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="admin-file-input"
                  onChange={handleFileChange}
                  disabled={saving}
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="admin-submit-btn"
                  disabled={saving}
                >
                  {saving ? "保存中..." : `[${selectedRoomId}] の変更を保存`}
                </button>
              </div>
            </form>
          ) : (
            <div className="no-selection-hint">
              <p>👈 左の一覧から編集したい部屋を選択してください</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
