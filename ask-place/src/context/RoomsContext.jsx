import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

const RoomsContext = createContext(undefined);
const ROOMS_CACHE_KEY = "ask-place:published-rooms:v1";

function readRoomsCache() {
  try {
    const serialized = window.localStorage.getItem(ROOMS_CACHE_KEY);
    if (!serialized) return null;

    const cache = JSON.parse(serialized);
    if (!Array.isArray(cache.rooms) || typeof cache.savedAt !== "number") {
      return null;
    }

    return cache.rooms;
  } catch (err) {
    console.warn("[RoomsContext] 公開部屋キャッシュの読み込みに失敗しました:", err);
    return null;
  }
}

function writeRoomsCache(rooms) {
  try {
    const cacheRooms = rooms.map((room) => ({
      ...room,
      updatedAt: typeof room.updatedAt?.toDate === "function"
        ? room.updatedAt.toDate().toISOString()
        : room.updatedAt,
    }));
    window.localStorage.setItem(
      ROOMS_CACHE_KEY,
      JSON.stringify({ rooms: cacheRooms, savedAt: Date.now() })
    );
  } catch (err) {
    // Storage is optional; the live Firestore result remains usable.
    console.warn("[RoomsContext] 公開部屋キャッシュの保存に失敗しました:", err);
  }
}

/**
 * 全ページ共通の部屋データ共有Provider
 * アプリ起動時に enabled == true の部屋を一括取得し、セッション内で共有する
 */
export function RoomsProvider({ children }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const hasLoadedRef = useRef(false);

  const fetchRooms = useCallback(async () => {
    if (hasLoadedRef.current) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "rooms"), where("enabled", "==", true));
      const snap = await getDocs(q);
      const roomList = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setRooms(roomList);
      writeRoomsCache(roomList);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error("[RoomsContext] 部屋データ取得エラー:", err);
      setError(err);
      // 取得済みデータは保持し、エラー状態だけ更新する。
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshRooms = useCallback(() => {
    try {
      window.localStorage.removeItem(ROOMS_CACHE_KEY);
    } catch (err) {
      console.warn("[RoomsContext] 公開部屋キャッシュの削除に失敗しました:", err);
    }
    return fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    const cached = readRoomsCache();
    if (cached) {
      setRooms(cached);
      hasLoadedRef.current = true;
      setLoading(false);
      return;
    }

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

  const getRoomByIdentifier = useCallback((identifier) => {
    return rooms.find((room) => room.id === identifier || room.roomName === identifier);
  }, [rooms]);

  return (
    <RoomsContext.Provider
      value={{ rooms, loading, refreshing, error, getRoomById, getRoomByIdentifier, refreshRooms }}
    >
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
 *   getRoomByIdentifier: (identifier: string) => import("../types/room").Room | undefined,
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
