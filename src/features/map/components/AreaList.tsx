import { Link } from '@tanstack/react-router'
import type { ClimbingArea } from '../../../types/api'

export const AreaList = ({
  areas,
  onSelect,
}: {
  areas: ClimbingArea[]
  onSelect: (id: number) => void
}) => {
  if (areas.length === 0)
    return <p className="px-4 py-8 text-center text-sm text-ink-3">No crags yet</p>

  return (
    <div className="px-4 pt-2 pb-2">
      {areas.map(area => (
        <Link
          key={area.id}
          to="/areas/$areaId"
          params={{ areaId: String(area.id) }}
          onClick={() => onSelect(area.id)}
          className="flex items-center justify-between gap-3 py-2.5 border-b border-dashed border-ink/15 active:bg-paper-2"
        >
          <span className="text-[14px] font-semibold text-ink truncate">{area.name}</span>
          {area.region && <span className="shrink-0 text-[12px] text-ink-3">{area.region}</span>}
        </Link>
      ))}
    </div>
  )
}
