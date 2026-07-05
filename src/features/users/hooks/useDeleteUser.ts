import { useMutation } from '@tanstack/react-query'
import { deleteUser } from '../api/deleteUser'

// No cache invalidation: on success the caller logs out and the session ends.
export const useDeleteUser = () =>
  useMutation({
    mutationFn: ({ userId }: { userId: number }) => deleteUser(userId),
  })
