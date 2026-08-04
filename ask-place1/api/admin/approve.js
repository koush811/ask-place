import { copy, del } from '@vercel/blob'
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
    const { pathname, url } = request.body || {}
    if (!pathname || !pathname.startsWith('pending/')) {
      response.status(400).json({ error: 'pathnameが不正です' })
      return
    }

    const approvedPath = pathname.replace(/^pending\//, 'approved/')

    // pending/ から approved/ へコピーしてから元を削除(=移動)
    await copy(url, approvedPath, { access: 'public' })
    await del(url)

    response.status(200).json({ ok: true })
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}
