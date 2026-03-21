export default function RTLWrapper({ children, className = '' }) {
  return (
    <div dir="rtl" lang="he" className={`font-hebrew ${className}`}>
      {children}
    </div>
  )
}
