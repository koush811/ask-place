import { del } from '@vercel/blob'
import { checkAdminAuth } from './_auth.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!checkAdminAuth(request)) {
    response.status(401).json({ error: '合言葉が正しくありません' })
    return
  }

  try {
    const { url } = request.body || {}
    if (!url) {
      response.status(400).json({ error: 'urlが不正です' })
      return
    }

    await del(url)
    response.status(200).json({ ok: true })
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}
