import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/ticks')({
  component: () => (
    <div className="flex items-center justify-center h-full text-ink-3 text-sm pt-20">
      Ticks — coming soon
    </div>
  ),
})
