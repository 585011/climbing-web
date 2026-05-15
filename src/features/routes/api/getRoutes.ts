import { apiClient } from "../../../lib/api-client";
import type { Routes } from '../../../types/api';

export const getRoutes = () => apiClient.get<Routes[]>('/routes');