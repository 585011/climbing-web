import { apiClient } from "../../../lib/api-client";
import type { Route } from '../../../types/api';

export const getRoutes = () => apiClient.get<Route[]>('/routes');