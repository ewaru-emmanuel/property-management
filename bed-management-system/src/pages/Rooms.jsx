import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useBuildings } from '../context/BuildingsContext';
import '../styles/room.css';

const Rooms = ({ selectedFloor }) => {
  const { selectedBuilding } = useBuildings();
  const [expandedRoom, setExpandedRoom] = useState(null);

  const { data: rooms = [], isLoading, error } = useQuery({
    queryKey: ['rooms', selectedFloor?.id],
    queryFn: () => api.get(`/api/floors/${selectedFloor.id}/rooms`),
    enabled: !!selectedFloor,
  });

  const toggleRoom = (id) => {
    setExpandedRoom(expandedRoom === id ? null : id);
  };

  const getStatus = (occupied, total) => {
    if (total === 0 || occupied === 0) return { label: 'Empty', class: 'empty' };
    if (occupied === total) return { label: 'Full', class: 'full' };
    return { label: 'Partial', class: 'partial' };
  };

  if (!selectedBuilding) return <p className="welcome">Select a building first.</p>;
  if (!selectedFloor) return <p className="welcome">Go to Floors and select one.</p>;

  if (isLoading) return <p>Loading rooms...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error.message}</p>;

  return (
    <div className="rooms-page">
      <h2>🛏️ {selectedBuilding.name} — {selectedFloor.name} — Rooms</h2>
      <p className="welcome">Click a room card to expand details.</p>

      {rooms.length === 0 ? (
        <div className="empty-state"><p>No rooms on this floor yet.</p></div>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room) => {
            const status = getStatus(room.occupied_decks, room.total_decks);
            const isExpanded = expandedRoom === room.id;
            return (
              <div key={room.id} className={`room-card ${status.class} ${isExpanded ? 'expanded' : ''}`}>
                <div className="room-summary" onClick={() => toggleRoom(room.id)}>
                  <div className="room-summary-left">
                    <h3>Room {room.name}</h3>
                  </div>
                  <div className="room-summary-right">
                    <span className="occupancy-tag">
                      {room.occupied_decks}/{room.total_decks}
                    </span>
                    <span className="status-badge">{status.label}</span>
                    <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="room-details">
                    <p>🛏️ {room.beds_count} Beds</p>
                    <p>👤 {room.occupied_decks} of {room.total_decks} decks occupied</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Rooms;