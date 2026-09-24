async function loadBitmap(file: Blob): Promise<ImageBitmap> {
  // EXIF の向きを反映して読み込む（iPhone の縦写真対策）
  return createImageBitmap(file, { imageOrientation: 'from-image' })
}

function drawResized(bmp: ImageBitmap, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bmp, 0, 0, w, h)
  return canvas
}

export interface PreparedPhoto {
  /** AI に送る JPEG（base64、接頭辞なし） */
  analysisBase64: string
  /** 記録に残すサムネイル（data URL） */
  thumbnail: string
}

export async function preparePhoto(file: Blob): Promise<PreparedPhoto> {
  const bmp = await loadBitmap(file)
  try {
    const analysis = drawResized(bmp, 1024).toDataURL('image/jpeg', 0.85)
    const thumbnail = drawResized(bmp, 320).toDataURL('image/jpeg', 0.7)
    return { analysisBase64: analysis.split(',')[1], thumbnail }
  } finally {
    bmp.close()
  }
}
