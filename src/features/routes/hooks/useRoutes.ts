import { useQuery } from '@tanstack/react-query';
import { getRoutes } from '../api/getRoutes';

export const useWalls = () =>
    useQuery({ queryKey: ['routes'], queryFn: getRoutes });