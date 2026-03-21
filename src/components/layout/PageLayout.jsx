// src/components/layout/PageLayout.jsx
import Navbar from './Navbar'

export default function PageLayout({ children, title, subtitle, actions }) {
  return (
    <div className="min-h-screen bg-idf-bg dark:bg-dark-bg transition-colors duration-200">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {(title || actions) && (
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            {title && (
              <div>
                <h1 className="text-2xl font-extrabold text-idf-blue dark:text-dark-blue">{title}</h1>
                {subtitle && <p className="text-gray-500 dark:text-dark-muted text-sm mt-0.5">{subtitle}</p>}
              </div>
            )}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
