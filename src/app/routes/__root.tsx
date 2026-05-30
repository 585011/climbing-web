import { createRootRoute, Outlet } from '@tanstack/react-router'
import { BottomNav } from '../../components/ui/BottomNav'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-paper flex flex-col max-w-md mx-auto relative">
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  ),
})
