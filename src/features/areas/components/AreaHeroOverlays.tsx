/** Back / save / region overlays for the area hero — absolutely positioned inside a relative hero container. */
export function AreaHeroOverlays({ region }: { region?: string }) {
  return (
    <>
      <button
        onClick={() => window.history.back()}
        className="absolute top-4 left-4 bg-paper/80 backdrop-blur-sm rounded-full px-3 py-1.5 text-[12px] text-ink flex items-center gap-1"
      >
        ‹ back
      </button>
      <button className="absolute top-4 right-4 bg-paper/80 backdrop-blur-sm rounded-full px-3 py-1.5 text-[12px] text-ink">
        ♡ save
      </button>
      {region && (
        <span className="absolute bottom-3 left-4 text-[11px] text-paper bg-ink/50 px-2 py-0.5 rounded-full">
          {region}
        </span>
      )}
    </>
  )
}
