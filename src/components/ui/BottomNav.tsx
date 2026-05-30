import { Link, useLocation } from '@tanstack/react-router'

type Tab = {
  to: string
  label: string
  icon: string
}

const TABS: Tab[] = [
  { to: '/',      label: 'Explore', icon: '◎' },
  { to: '/map',   label: 'Map',     icon: '◇' },
  { to: '/ticks', label: 'Ticks',   icon: '✓' },
  { to: '/me',    label: 'Me',      icon: '○' },
]

export const BottomNav = () => {
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-paper border-t border-ink/15 flex justify-around py-2 px-4 z-10">
      {TABS.map(({ to, label, icon }) => {
        const active =
          to === '/'
            ? pathname === '/' || pathname.startsWith('/areas')
            : pathname.startsWith(to)
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 min-w-[48px] py-1 ${active ? 'text-ink font-bold' : 'text-ink-3'}`}
          >
            <span className="text-sm leading-none">{icon}</span>
            <span className="text-[10px] leading-none">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
