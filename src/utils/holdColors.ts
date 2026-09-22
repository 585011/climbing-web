/** Common gym hold colours offered as quick picks; users may also type their own. */
export const HOLD_COLORS: { value: string; swatch: string }[] = [
  { value: 'yellow', swatch: '#e8c21a' },
  { value: 'green', swatch: '#2f9e44' },
  { value: 'blue', swatch: '#1c7ed6' },
  { value: 'red', swatch: '#e03131' },
  { value: 'orange', swatch: '#f08c00' },
  { value: 'purple', swatch: '#7048e8' },
  { value: 'pink', swatch: '#e64980' },
  { value: 'black', swatch: '#1a1814' },
  { value: 'white', swatch: '#ffffff' },
  { value: 'grey', swatch: '#8a8377' },
]

/** CSS colour for a stored hold colour; null when it isn't a known preset. */
export const holdColorSwatch = (color: string): string | null =>
  HOLD_COLORS.find(c => c.value === color.trim().toLowerCase())?.swatch ?? null
