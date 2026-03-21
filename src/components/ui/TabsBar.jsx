// src/components/ui/TabsBar.jsx
export default function TabsBar({ tabs, activeTab, onChange }) {
  return (
    <div className="tabs-scroll border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface sticky top-14 z-40">
      <div className="flex min-w-max px-1 pt-1 gap-0.5">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 whitespace-nowrap rounded-t-lg ${
              activeTab === i
                ? 'border-idf-blue text-idf-blue bg-blue-50 dark:border-dark-blue dark:text-dark-blue dark:bg-dark-blue/10'
                : 'border-transparent text-gray-500 hover:text-idf-blue hover:bg-gray-50 dark:text-dark-muted dark:hover:text-dark-blue dark:hover:bg-dark-surface2'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
