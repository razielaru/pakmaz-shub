export default function Spinner({ size = 'md', color = 'blue' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-14 h-14' }
  const colors = { blue: 'border-idf-blue', green: 'border-idf-green', white: 'border-white' }
  return (
    <div className="flex items-center justify-center">
      <div className={`${sizes[size]} ${colors[color]} border-4 border-t-transparent rounded-full animate-spin`} />
    </div>
  )
}
