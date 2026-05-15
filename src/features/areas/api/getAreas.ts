import { apiClient } from "../../../lib/api-client";
import type { ClimbingAreas } from '../../../types/api';

export const getAreas = () => apiClient.get<ClimbingAreas[]>('/climbing_areas');