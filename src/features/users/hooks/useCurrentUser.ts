import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '../api/getCurrentUser'

export const useCurrentUser = () =>
  useQuery({ queryKey: ['users', 'me'], queryFn: getCurrentUser })
