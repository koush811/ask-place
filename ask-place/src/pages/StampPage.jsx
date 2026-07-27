import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import mapData from '../data/campus_map_data.json'
import { addStamp, getStamps } from '../utils/stamps.js'

const { nodes } = mapData

export default function StampPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    const room = nodes.find(
      (p) => p.type === 'stamp' && p.stampToken === decodeURIComponent(token || ''),
    )

    if (!room) {
      navigate('/', {
        replace: true,
        state: { toast: '該当する教室が見つかりません' },
      })
      return
    }

    const { added, stamps } = addStamp(room.name)
    const totalStampRooms = nodes.filter((p) => p.type === 'stamp').length
    const allDone = stamps.length >= totalStampRooms

    let toast
    if (allDone) {
      toast = 'すべてのスタンプを取得しました'
    } else if (added) {
      toast = `${room.name} のスタンプを取得しました`
    } else {
      toast = `${room.name} のスタンプは取得済みです`
    }

    navigate('/', {
      replace: true,
      state: { floor: room.floor, highlightId: room.id, toast },
    })
  }, [token, navigate])

  return null
}
