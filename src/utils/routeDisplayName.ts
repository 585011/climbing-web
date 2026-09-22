/** Gym routes are often unnamed — fall back to their hold colour ("Yellow route"). */
export const routeDisplayName = (route: { name: string; holdColor: string }): string => {
  if (route.name) return route.name
  const color = route.holdColor.trim()
  return color ? `${color.charAt(0).toUpperCase()}${color.slice(1)} route` : 'Unnamed route'
}
