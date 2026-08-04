import { handleUpload } from '@vercel/blob/client'

// 来場者からの写真アップロード用トークン発行エンドポイント。
// アップロード先は必ず "pending/" 配下に固定し、承認前の写真が
// 公開一覧(/api/photos)に出ないようにしている。
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const body = request.body

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // pending/ 以外への書き込みは許可しない
        if (!pathname.startsWith('pending/')) {
          throw new Error('Invalid upload path')
        }
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
          addRandomSuffix: true,
          maximumSizeInBytes: 15 * 1024 * 1024, // 15MB
          tokenPayload: JSON.stringify({}),
        }
      },
      onUploadCompleted: async () => {
        // 特に追加処理は無し(承認はadmin側で別途行う)
      },
    })

    response.status(200).json(jsonResponse)
  } catch (error) {
    response.status(400).json({ error: error.message })
  }
}
