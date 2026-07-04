import { useQuery } from '@tanstack/react-query';
import { getAreas } from '../api/getAreas';

export const useAreas = () =>
    useQuery({
        queryKey: ['areas'],
        queryFn: getAreas,
        // Crag list changes rarely — serve cached data instantly on revisit.
        staleTime: 5 * 60 * 1000,
    });