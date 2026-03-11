import { useRef, useState } from 'react'

export default function SignaturePad({ onSave }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSig, setHasSig] = useState(false)

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches?.[0]
    return {
      x: ((touch?.clientX ?? e.clientX) - rect.left) * (canvas.width / rect.width),
      y: ((touch?.clientY ?? e.clientY) - rect.top) * (canvas.height / rect.height),
    }
  }

  function startDraw(e) {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
  }

  function draw(e) {
    if (!drawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1a3a5c'
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasSig(true)
  }

  function endDraw(e) {
    e.preventDefault()
    setDrawing(false)
  }

  function clear() {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
    onSave?.(null)
  }

  function save() {
    if (!hasSig) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onSave?.(dataUrl)
  }

  return (
    <div className="space-y-3">
      <p className="label">חתימת מבקר (אופציונלי)</p>
      <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={150}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={clear} className="btn-outline text-sm py-1.5 px-4">
          🗑️ מחק
        </button>
        {hasSig && (
          <button type="button" onClick={save} className="btn-success text-sm py-1.5 px-4">
            ✅ שמור חתימה
          </button>
        )}
      </div>
      {!hasSig && <p className="text-xs text-gray-400">חתום כאן עם האצבע או העכבר</p>}
    </div>
  )
}
