/**
 * photoWatermark.js
 * מוסיף חותמת טקסט על תמונה בדפדפן — ללא שרת
 *
 * שימוש:
 *   const watermarkedFile = await applyWatermark(file, {
 *     base: 'מחנה עופר', inspector: 'כהן', lat: 31.251, lon: 34.792
 *   })
 *   // watermarkedFile = File מוכן להעלאה
 */

export async function applyWatermark(file, { base, inspector, lat, lon }) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')

      // צייר תמונה מקורית
      ctx.drawImage(img, 0, 0)

      // הגדרות חותמת
      const now       = new Date()
      const timeStr   = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      const dateStr   = now.toLocaleDateString('he-IL')
      const gpsStr    = (lat && lon) ? `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}` : 'GPS: לא זמין'
      const lines     = [
        `בסיס: ${base}`,
        `מבקר: ${inspector}`,
        `${dateStr} ${timeStr}`,
        gpsStr,
      ]

      const padding   = 14
      const lineH     = 22
      const boxH      = lines.length * lineH + padding * 2
      const boxW      = 300
      const x         = canvas.width  - boxW - 16
      const y         = canvas.height - boxH - 16

      // רקע שקוף כהה
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
      ctx.beginPath()
      roundRect(ctx, x, y, boxW, boxH, 10)
      ctx.fill()

      // טקסט
      ctx.fillStyle = '#ffffff'
      ctx.font      = `bold ${lineH - 4}px Arial, sans-serif`
      ctx.textAlign = 'right'
      ctx.direction = 'rtl'
      lines.forEach((line, i) => {
        ctx.fillText(line, x + boxW - padding, y + padding + (i + 1) * lineH - 4)
      })

      URL.revokeObjectURL(url)

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Watermark failed')); return }
          const out = new File([blob], file.name, { type: 'image/jpeg' })
          resolve(out)
        },
        'image/jpeg',
        0.92
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

/** עזר: פינות מעוגלות ב-canvas */
function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
