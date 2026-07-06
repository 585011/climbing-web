import type { Wall } from '../../../types/api'

/**
 * Maps each area id to a representative wall image for the crag list, taking the
 * first wall (in the given order) that has one. Prefers the small `thumbnailUrl`
 * variant and falls back to the full `imageUrl` for walls that predate backfill.
 */
export function areaImageMap(walls: Wall[]): Map<number, string> {
  const byArea = new Map<number, string>()
  for (const wall of walls) {
    const url = wall.thumbnailUrl ?? wall.imageUrl
    if (url && !byArea.has(wall.areaId)) {
      byArea.set(wall.areaId, url)
    }
  }
  return byArea
}
