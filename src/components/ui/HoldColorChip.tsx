import { holdColorSwatch } from '../../utils/holdColors'

/** Small colour dot + label for a gym route's hold colour. Renders nothing when empty. */
export const HoldColorChip = ({ color }: { color: string }) => {
  if (!color) return null
  const swatch = holdColorSwatch(color)
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-ink-2">
      <span
        aria-hidden
        className="w-2.5 h-2.5 rounded-full border border-ink/30 shrink-0"
        style={{ background: swatch ?? 'transparent' }}
      />
      {color}
    </span>
  )
}
