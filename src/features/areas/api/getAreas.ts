import { apiClient } from "../../../lib/api-client";
import type { ClimbingArea } from '../../../types/api';

export const getAreas = () => apiClient.get<ClimbingArea[]>('/climbing-areas');