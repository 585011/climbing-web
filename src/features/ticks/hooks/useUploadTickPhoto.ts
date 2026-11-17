import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadTickPhoto } from '../api/uploadTickPhoto'
import { showToast } from '../../../stores/toast'

/**
 * Attaches a photo to a tick that was just saved. The upload is a second
 * request, so a failure must not lose the tick: `done` runs either way, and a
 * toast says the photo is missing (the climber can add it again by editing the tick).
 */
export const useUploadTickPhoto = () => {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ userId, tickId, photo }: { userId: number; tickId: number; photo: File }) =>
      uploadTickPhoto(userId, tickId, photo),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['users', userId, 'ticks'] })
    },
  })

  const attachPhoto = (userId: number, tickId: number, photo: File | null, done: () => void) => {
    if (!photo) {
      done()
      return
    }
    mutation.mutate(
      { userId, tickId, photo },
      {
        onSuccess: done,
        onError: () => {
          showToast({ message: "Tick saved, but the photo didn't upload — edit the tick to try again" })
          done()
        },
      },
    )
  }

  return { attachPhoto, isUploading: mutation.isPending }
}
