import { Link, useLocation } from '@tanstack/react-router'

// Inline SVGs instead of Unicode glyphs — Chromium renders characters like
// ○ (U+25CB) as emoji, which clashes with the other tab icons.
const ICON_PROPS = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

const ExploreIcon = () => (
  <svg {...ICON_PROPS}>
    <circle cx="12" cy="12" r="9" />
    <polygon points="15.5,8.5 13.5,13.5 8.5,15.5 10.5,10.5" />
  </svg>
)

const MapIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
    <path d="M9 4v14" />
    <path d="M15 6v14" />
  </svg>
)

const TicksIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
)

const MeIcon = () => (
  <svg {...ICON_PROPS}>
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
  </svg>
)

type Tab = {
  to: string
  label: string
  Icon: () => React.JSX.Element
}

const TABS: Tab[] = [
  { to: '/',      label: 'Explore', Icon: ExploreIcon },
  { to: '/map',   label: 'Map',     Icon: MapIcon },
  { to: '/ticks', label: 'Ticks',   Icon: TicksIcon },
  { to: '/me',    label: 'Me',      Icon: MeIcon },
]

export const BottomNav = () => {
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-paper/90 backdrop-blur border border-ink/15 rounded-full shadow-lg flex py-2 px-2 z-10">
      {TABS.map(({ to, label, Icon }) => {
        const active =
          to === '/'
            ? pathname === '/' || pathname.startsWith('/areas')
            : pathname.startsWith(to)
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-full ${active ? 'text-ink font-bold' : 'text-ink-3'}`}
          >
            <Icon />
            <span className="text-[10px] leading-none">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
