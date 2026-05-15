import { useQuery } from '@tanstack/react-query';
import { getAreas } from '../api/getAreas';

export const useAreas = () =>
    useQuery({ queryKey: ['climbing-areas'], queryFn: getAreas });