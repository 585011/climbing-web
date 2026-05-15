import { apiClient } from "../../../lib/api-client";
import type { Walls } from '../../../types/api';

export const getWalls = () => apiClient.get<Walls[]>('/walls');