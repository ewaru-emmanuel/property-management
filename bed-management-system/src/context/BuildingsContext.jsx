import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const BuildingsContext = createContext(null);

export const BuildingsProvider = ({ children }) => {
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  const { data: buildings = [], isLoading, error, refetch } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => api.get('/api/buildings'),
  });

  // Auto-select first building if none selected
  useEffect(() => {
    if (buildings.length === 0) {
      if (selectedBuilding) setSelectedBuilding(null);
      return;
    }
    // Keep selected if it still exists
    if (selectedBuilding) {
      const stillExists = buildings.find((b) => b.id === selectedBuilding.id);
      if (!stillExists) setSelectedBuilding(buildings[0]);
    } else {
      setSelectedBuilding(buildings[0]);
    }
  }, [buildings]);

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