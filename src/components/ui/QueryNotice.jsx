export default function QueryNotice({ title = 'אירעה שגיאה', message, action = null }) {
  return (
    <div className="card border-2 border-red-200 bg-red-50 text-right">
      <h3 className="font-bold text-red-800">{title}</h3>
      <p className="text-sm text-red-700 mt-2 whitespace-pre-wrap">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
