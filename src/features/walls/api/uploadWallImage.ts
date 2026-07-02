import { apiClient } from '../../../lib/api-client'
import { WallSchema } from '../../../types/api'

export const uploadWallImage = async (wallId: number, file: File) => {
  const form = new FormData()
  form.append('image', file)
  const raw = await apiClient.putMultipart(`/walls/${wallId}/image`, form)
  return WallSchema.parse(raw)
}
