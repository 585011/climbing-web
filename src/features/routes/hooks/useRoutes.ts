import { useQuery } from '@tanstack/react-query';
import { getRoutes } from '../api/getRoutes';

export const useRoutes = () =>
    useQuery({ queryKey: ['routes'], queryFn: getRoutes });