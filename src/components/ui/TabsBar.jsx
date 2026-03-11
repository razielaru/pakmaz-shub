export default function TabsBar({ tabs, activeTab, onChange }) {
  return (
    <div className="tabs-scroll border-b border-gray-200 bg-white sticky top-14 z-30">
      <div className="flex min-w-max">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === i
                ? 'border-idf-blue text-idf-blue bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-idf-blue hover:bg-gray-50'
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
