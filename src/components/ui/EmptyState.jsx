export default function EmptyState({
  icon = 'ℹ️',
  title,
  description,
  action = null,
}) {
  return (
    <div className="card text-center py-12 px-5">
      <div className="text-5xl mb-3">{icon}</div>
      <h3 className="text-xl font-bold text-gray-800">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-2 max-w-xl mx-auto">{description}</p>}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}
