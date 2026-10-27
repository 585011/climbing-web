import { apiClient } from '../../../lib/api-client'
import { UserRouteTickSchema } from '../../../types/api'

/** Adds or replaces a gym tick's photo. Send an already-compressed file (see TickPhotoPicker). */
export const uploadTickPhoto = async (userId: number, tickId: number, photo: File) => {
  const form = new FormData()
  form.append('image', photo)
  const raw = await apiClient.putMultipart(`/users/${userId}/ticks/${tickId}/photo`, form)
  return UserRouteTickSchema.parse(raw)
}
