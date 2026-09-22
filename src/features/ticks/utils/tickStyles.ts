/** How a route was sent. Values match the backend's tick `style` enum. */
export const TICK_STYLES: { value: string; label: string; description: string }[] = [
  { value: 'onsight', label: 'Onsight', description: 'first try, no beta' },
  { value: 'flash', label: 'Flash', description: 'first try, had beta' },
  { value: 'redpoint', label: 'Redpoint', description: 'sent after working it' },
  { value: 'free solo', label: 'Free solo', description: 'no rope' },
]
