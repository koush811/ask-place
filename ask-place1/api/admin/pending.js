import { list } from '@vercel/blob'
import { checkAdminAuth } from './_auth.js'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!checkAdminAuth(request)) {
    response.status(401).json({ error: '合言葉が正しくありません' })
    return
  }

  try {
    const { blobs } = await list({ prefix: 'pending/' })

    const photos = blobs
      .map((b) => ({
        url: b.url,
        pathname: b.pathname,
        uploadedAt: b.uploadedAt,
      }))
      .sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt))

    response.status(200).json({ photos })
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}
