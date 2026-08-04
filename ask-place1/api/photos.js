import { list } from '@vercel/blob'

// 承認済み(approved/配下)の写真一覧を返す公開エンドポイント。
// pending/配下(承認待ち)の写真はここには出てこない。
export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const { blobs } = await list({ prefix: 'approved/' })

    const photos = blobs
      .map((b) => ({
        url: b.url,
        pathname: b.pathname,
        uploadedAt: b.uploadedAt,
      }))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))

    response.status(200).json({ photos })
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}
