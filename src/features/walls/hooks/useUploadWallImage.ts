import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadWallImage } from '../api/uploadWallImage'

export const useUploadWallImage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ wallId, file }: { wallId: number; file: File }) =>
      uploadWallImage(wallId, file),
    onSuccess: (wall) => {
      queryClient.invalidateQueries({ queryKey: ['walls', wall.id] })
      queryClient.invalidateQueries({ queryKey: ['areas', wall.areaId, 'walls'] })
    },
  })
}
