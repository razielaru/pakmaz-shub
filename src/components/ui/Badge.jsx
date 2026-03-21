export default function Badge({ children, type = 'default', size = 'sm' }) {
  const styles = {
    success: 'bg-green-100 text-green-800 border border-green-300',
    error: 'bg-red-100 text-red-800 border border-red-300',
    warning: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    info: 'bg-blue-100 text-blue-800 border border-blue-300',
    default: 'bg-gray-100 text-gray-700 border border-gray-300',
    purple: 'bg-purple-100 text-purple-800 border border-purple-300',
  }
  const sizes = { xs: 'text-xs px-1.5 py-0.5', sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1' }
  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-full ${styles[type]} ${sizes[size]}`}>
      {children}
    </span>
  )
}
