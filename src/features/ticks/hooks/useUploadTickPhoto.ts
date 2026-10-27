import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadTickPhoto } from '../api/uploadTickPhoto'

export const useUploadTickPhoto = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, tickId, photo }: { userId: number; tickId: number; photo: File }) =>
      uploadTickPhoto(userId, tickId, photo),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['users', userId, 'ticks'] })
    },
  })
}
