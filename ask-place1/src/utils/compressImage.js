/**
 * スマホの写真(数MB〜十数MB)をアップロード前に縮小・圧縮する。
 * 無料枠のストレージ/転送量を節約し、アップロード自体も速くするため。
 * @param {File} file
 * @param {{maxWidth?: number, quality?: number}} options
 * @returns {Promise<File>}
 */
export async function compressImage(file, { maxWidth = 1600, quality = 0.8 } = {}) {
  // HEIC等ブラウザがcanvasに描画できない形式はそのまま返す(サーバー側で弾かれない範囲)
  if (!file.type.startsWith('image/') || file.type === 'image/heic') {
    return file
  }

  const imageBitmap = await createImageBitmap(file).catch(() => null)
  if (!imageBitmap) return file

  const scale = Math.min(1, maxWidth / imageBitmap.width)
  const width = Math.round(imageBitmap.width * scale)
  const height = Math.round(imageBitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imageBitmap, 0, 0, width, height)

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  if (!blob) return file

  const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], newName, { type: 'image/jpeg' })
}
