import { useQuery } from '@tanstack/react-query';
import { getWalls } from '../api/getWalls';

export const useWalls = () =>
    // Wall responses carry short-lived presigned image URLs (15-min). Without a
    // staleTime, every mount/window-focus refetch mints fresh URLs whose query
    // string differs, busting the browser image cache and re-downloading every
    // crag thumbnail. 10 min keeps URLs stable within their presign window.
    useQuery({ queryKey: ['walls'], queryFn: getWalls, staleTime: 10 * 60 * 1000 });