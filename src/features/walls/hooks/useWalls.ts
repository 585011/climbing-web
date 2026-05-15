import { useQuery } from '@tanstack/react-query';
import { getWalls } from '../api/getWalls';

export const useWalls = () =>
    useQuery({ queryKey: ['walls'], queryFn: getWalls });