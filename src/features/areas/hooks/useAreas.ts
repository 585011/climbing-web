import { useQuery } from '@tanstack/react-query';
import { getAreas } from '../api/getAreas';

export const useWalls = () =>
    useQuery({ queryKey: ['areas'], queryFn: getAreas });