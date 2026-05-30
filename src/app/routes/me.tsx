import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/me')({
  component: () => (
    <div className="flex items-center justify-center h-full text-ink-3 text-sm pt-20">
      Me — coming soon
    </div>
  ),
})
