// The MapLibre CSP build ships no type declarations. Its default export is the
// same module surface as the typed main entry (Map, Marker, LngLatBounds,
// setWorkerUrl, …), so reuse those types.
declare module 'maplibre-gl/dist/maplibre-gl-csp' {
  const maplibregl: typeof import('maplibre-gl')
  export default maplibregl
}
