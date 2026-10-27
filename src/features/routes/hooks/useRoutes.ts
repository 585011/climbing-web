import { useQuery } from '@tanstack/react-query';
import { getRoutes } from '../api/getRoutes';

/** `includeRetired` for tick history, where rotated-out gym routes must still resolve. */
export const useRoutes = (options?: { includeRetired?: boolean }) =>
    useQuery({
        queryKey: options?.includeRetired ? ['routes', { includeRetired: true }] : ['routes'],
        queryFn: () => getRoutes(options),
    });
