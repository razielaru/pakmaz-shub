export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'אישור', danger = false }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-slide-up" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6 text-sm">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-outline text-sm py-1.5 px-4">ביטול</button>
          <button
            onClick={onConfirm}
            className={`${danger ? 'btn-danger' : 'btn-primary'} text-sm py-1.5 px-4`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
