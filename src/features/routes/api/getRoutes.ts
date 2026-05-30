import { apiClient } from "../../../lib/api-client";
import type { ClimbingRoute } from '../../../types/api';

export const getRoutes = () => apiClient.get<ClimbingRoute[]>('/routes');