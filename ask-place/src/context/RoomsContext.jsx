import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

const RoomsContext = createContext(undefined);

/**
 * 全ページ共通の部屋データ共有Provider
 * アプリ起動時に enabled == true の部屋を一括取得し、セッション内で共有する
 */
export function RoomsProvider({ children }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "rooms"), where("enabled", "==", true));
      const snap = await getDocs(q);
      const roomList = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setRooms(roomList);
    } catch (err) {
      console.error("[RoomsContext] 部屋データ取得エラー:", err);
      setError(err);
      // Firebase未接続または未設定時でもアプリが壊れないよう空配列を維持
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  /**
   * 指定したroomIdの部屋データを取得する
   * @param {string} id - roomId
   * @returns {import("../types/room").Room | undefined}
   */
  const getRoomById = useCallback((id) => {
    return rooms.find((r) => r.id === id);
  }, [rooms]);

  return (
    <RoomsContext.Provider value={{ rooms, loading, error, getRoomById, refreshRooms: fetchRooms }}>
      {children}
    </RoomsContext.Provider>
  );
}

/**
 * 部屋データContextを利用するためのカスタムフック
 * @returns {{
 *   rooms: import("../types/room").Room[],
 *   loading: boolean,
 *   error: any,
 *   getRoomById: (id: string) => import("../types/room").Room | undefined,
 *   refreshRooms: () => Promise<void>
 * }}
 */
export function useRooms() {
  const ctx = useContext(RoomsContext);
  if (!ctx) {
    throw new Error("useRooms must be used within RoomsProvider");
  }
  return ctx;
}
