import { createFileRoute } from '@tanstack/react-router'
import { AreasList } from '../../features/areas/components/AreasList'

export const Route = createFileRoute('/')({
  component: () => <AreasList />,
})