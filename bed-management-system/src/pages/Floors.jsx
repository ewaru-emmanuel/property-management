import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useBuildings } from '../context/BuildingsContext';
import '../styles/floor.css';

const Floors = ({ onSelectFloor }) => {
  const { selectedBuilding } = useBuildings();

  const { data: floors = [], isLoading, error } = useQuery({
    queryKey: ['floors', selectedBuilding?.id],
    queryFn: () => api.get(`/api/buildings/${selectedBuilding.id}/floors`),
    enabled: !!selectedBuilding,
  });

  const getStatus = (occupied, total) => {
    if (total === 0 || occupied === 0) return { label: 'Empty', class: 'empty' };
    if (occupied === total) return { label: 'Full', class: 'full' };
    return { label: 'Partial', class: 'partial' };
  };

  if (!selectedBuilding) {
    return (
      <div className="floors-page">
        <h2>Floors</h2>
        <p className="welcome">Select a building from the header.</p>
      </div>
    );
  }

  if (isLoading) return <p>Loading floors...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error.message}</p>;

  return (
    <div className="floors-page">
      <h2>{selectedBuilding.name} — Floors</h2>
      <p className="welcome">Manage all floors in this building.</p>

      {floors.length === 0 ? (
        <div className="empty-state">
          <p>No floors yet. Add a building with floors in the Admin panel.</p>
        </div>
      ) : (
        <div className="floors-grid">
          {floors.map((floor) => {
            const status = getStatus(floor.occupied_beds, floor.total_beds);
            return (
              <div
                key={floor.id}
                className={`floor-card ${status.class}`}
                onClick={() => onSelectFloor && onSelectFloor(floor)}
                style={{ cursor: 'pointer' }}
              >
                <h3>{floor.name}</h3>
                <div classname="floor-details">
                  <p>🛏️ {floor.rooms_count} Rooms</p>
                  <p>👤 {floor.occupied_beds} / {floor.total_beds} Beds</p>
                </div>
                <span className="status-badge">{status.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Floors;