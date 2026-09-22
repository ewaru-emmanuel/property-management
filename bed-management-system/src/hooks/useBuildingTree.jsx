import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useBuildingTree(buildingId) {
  return useQuery({
    queryKey: ['building-tree', buildingId],
    queryFn: () => api.get(`/api/buildings/${buildingId}/tree`),
    enabled: !!buildingId,
    staleTime: 1000 * 60 * 5,   // 5 min fresh
    gcTime: 1000 * 60 * 30,     // 30 min cached
  });
}