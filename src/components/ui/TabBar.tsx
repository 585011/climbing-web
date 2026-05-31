interface TabBarProps<T extends string> {
  tabs: readonly T[]
  active: T
  onChange: (tab: T) => void
}

export function TabBar<T extends string>({ tabs, active, onChange }: TabBarProps<T>) {
  return (
    <div className="flex border-b border-ink/15">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 py-2.5 text-[13px] font-medium transition-colors ${
            tab === active
              ? 'text-ink border-b-2 border-ink -mb-px'
              : 'text-ink-3'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
