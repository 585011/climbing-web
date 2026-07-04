type Point = { latitude: number; longitude: number }

const EARTH_RADIUS_KM = 6371
const toRad = (deg: number) => (deg * Math.PI) / 180

/** Great-circle distance between two lat/lng points in kilometres. */
export const haversineKm = (a: Point, b: Point): number => {
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s))
}
