import { useEffect, useRef, useState } from 'react'
// CSP build: loads the map worker from a real same-origin URL instead of a
// runtime blob:, so it runs under a strict CSP (script-src 'self') without
// needing 'unsafe-eval'/'wasm-unsafe-eval'. The default build's blob worker is
// blocked as an eval by Firefox/Safari, leaving the map blank. See Caddyfile.
import maplibregl from 'maplibre-gl/dist/maplibre-gl-csp'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker.js?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { ClimbingArea } from '../../../types/api'

maplibregl.setWorkerUrl(maplibreWorkerUrl)
import { AreaCard } from './AreaCard'
import { LocateButton } from './LocateButton'

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

interface MapViewProps {
  areas: ClimbingArea[]
  selectedId: number | null
  onSelect: (id: number | null) => void
}

// Small accent pin element for an area marker.
const pinElement = (): HTMLElement => {
  const el = document.createElement('div')
  el.className = 'map-pin'
  el.style.cssText =
    'width:16px;height:16px;border-radius:9999px;background:var(--color-accent);border:2px solid var(--color-paper);box-shadow:0 1px 3px rgba(0,0,0,.4);cursor:pointer'
  return el
}

const MapView = ({ areas, selectedId, onSelect }: MapViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef(new Map<number, maplibregl.Marker>())
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  // Latest onSelect without re-running the map-init effect.
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  })

  // Init map + markers once. Areas are stable for the map's lifetime here
  // (the route filters them before mount); re-fitting on every change isn't
  // needed for the current data scale.
  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [10, 61], // Norway fallback until bounds fit
      zoom: 4,
    })
    mapRef.current = map

    // The init effect runs before the browser flushes layout, so the
    // container can still be 0×0 when MapLibre measures it — leaving the
    // canvas blank until something forces a resize. Resize on load and
    // whenever the container's box changes so the map fills its space
    // without needing fullscreen.
    map.on('load', () => map.resize())
    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(containerRef.current)

    // Tapping the map background clears the selection.
    map.on('click', () => onSelectRef.current(null))

    const bounds = new maplibregl.LngLatBounds()
    for (const area of areas) {
      const el = pinElement()
      el.addEventListener('click', e => {
        e.stopPropagation() // don't also trigger the background deselect
        onSelectRef.current(area.id)
      })
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([area.longitude, area.latitude])
        .addTo(map)
      markersRef.current.set(area.id, marker)
      bounds.extend([area.longitude, area.latitude])
    }
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 0 })

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reflect selection in the pin styling.
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const el = marker.getElement()
      const selected = id === selectedId
      el.style.transform = selected ? 'scale(1.5)' : ''
      el.style.zIndex = selected ? '1' : ''
    }
  }, [selectedId])

  // Keep the canvas sized when entering/leaving fullscreen.
  useEffect(() => {
    const onFsChange = () => {
      setFullscreen(Boolean(document.fullscreenElement))
      mapRef.current?.resize()
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else containerRef.current?.requestFullscreen?.()
  }

  const flyToUser = (coords: { latitude: number; longitude: number }) => {
    const map = mapRef.current
    if (!map) return
    userMarkerRef.current?.remove()
    const el = document.createElement('div')
    el.style.cssText =
      'width:14px;height:14px;border-radius:9999px;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.3)'
    userMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([coords.longitude, coords.latitude])
      .addTo(map)
    map.flyTo({ center: [coords.longitude, coords.latitude], zoom: 11 })
  }

  const selectedArea = areas.find(a => a.id === selectedId) ?? null

  return (
    <div className="relative h-[60vh] w-full overflow-hidden rounded-xl border border-ink/15">
      <div ref={containerRef} className="absolute inset-0" />
      <button
        onClick={toggleFullscreen}
        aria-label={fullscreen ? 'Exit fullscreen' : 'Expand map'}
        className="absolute top-3 right-3 h-9 w-9 flex items-center justify-center rounded-lg border border-ink/20 bg-paper/95 text-ink-2 shadow active:text-ink"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {fullscreen ? (
            <path d="M9 3H5a2 2 0 0 0-2 2v4m18 0V5a2 2 0 0 0-2-2h-4M3 15v4a2 2 0 0 0 2 2h4m6 0h4a2 2 0 0 0 2-2v-4" />
          ) : (
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          )}
        </svg>
      </button>
      <LocateButton onLocate={flyToUser} />
      {selectedArea && <AreaCard area={selectedArea} onClose={() => onSelect(null)} />}
    </div>
  )
}

export default MapView
