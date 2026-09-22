import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const BuildingsContext = createContext(null);

export const BuildingsProvider = ({ children }) => {
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const qc = useQueryClient();

  const {
    data: buildings = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => api.get('/api/buildings'),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  // Auto-select first building
  useEffect(() => {
    if (buildings.length === 0) {
      if (selectedBuilding) setSelectedBuilding(null);
      return;
    }
    if (selectedBuilding) {
      const stillExists = buildings.find((b) => b.id === selectedBuilding.id);
      if (!stillExists) setSelectedBuilding(buildings[0]);
    } else {
      setSelectedBuilding(buildings[0]);
    }
  }, [buildings]);

  // Prefetch each building's tree in the background
  useEffect(() => {
    if (!buildings.length) return;

    buildings.forEach((b) => {
      qc.prefetchQuery({
        queryKey: ['building-tree', b.id],
        queryFn: () => api.get(`/api/buildings/${b.id}/tree`),
        staleTime: 1000 * 60 * 5,
      });
    });
  }, [buildings, qc]);

  return (
    <BuildingsContext.Provider
      value={{
        buildings,
        selectedBuilding,
        setSelectedBuilding,
        loading: isLoading,
        error: error?.message || null,
        refreshBuildings: refetch,
      }}
    >
      {children}
    </BuildingsContext.Provider>
  );
};

export const useBuildings = () => {
  const ctx = useContext(BuildingsContext);
  if (!ctx) throw new Error('useBuildings must be used inside <BuildingsProvider>');
  return ctx;
};