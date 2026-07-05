import { Link } from '@tanstack/react-router'

export const TicksEmptyState = () => (
  <div className="flex flex-col items-center gap-3 py-16 px-4 text-center">
    <p className="text-sm text-ink-2">No ticks yet — find a crag and log your first send</p>
    <Link to="/" className="text-sm font-semibold text-accent">
      Explore crags →
    </Link>
  </div>
)
