const STORAGE_KEY = 'stampData'

export function getStamps() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function hasStamp(roomName) {
  return getStamps().includes(roomName)
}

/**
 * Adds a stamp for the given room name if not already collected.
 * Returns { added, stamps } where added is true only if this call newly added it.
 */
export function addStamp(roomName) {
  const current = getStamps()
  if (current.includes(roomName)) {
    return { added: false, stamps: current }
  }
  const next = [...current, roomName]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return { added: true, stamps: next }
}
