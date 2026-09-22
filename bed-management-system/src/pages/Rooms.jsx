import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useBuildings } from '../context/BuildingsContext';
import RoomMap from '../components/RoomMap';
import DeckDetailSheet from '../components/DeckDetailSheet';
import ConfirmModal from '../components/ConfirmModal';
import AddOccupantModal from '../components/AddOccupantModal';
import '../styles/room.css';

const Rooms = ({ selectedFloor }) => {
  const { selectedBuilding } = useBuildings();
  const qc = useQueryClient();

  const [expandedRoom, setExpandedRoom] = useState(null);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [confirmCheckout, setConfirmCheckout] = useState(null);
  const [addOccupantDeck, setAddOccupantDeck] = useState(null);

  const { data: rooms = [], isLoading, error } = useQuery({
    queryKey: ['rooms', selectedFloor?.id],
    queryFn: () => api.get(`/api/floors/${selectedFloor.id}/rooms`),
    enabled: !!selectedFloor,
  });

  const checkOutMutation = useMutation({
    mutationFn: (occupantId) => api.delete(`/api/occupants/${occupantId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({ queryKey: ['occupants'] });
      qc.invalidateQueries({ queryKey: ['decks'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['building-tree'] });
      setConfirmCheckout(null);
      setSelectedDeck(null);
    },
    onError: (err) => alert('Failed to check out: ' + err.message),
  });

  const toggleRoom = (id) => {
    setExpandedRoom(expandedRoom === id ? null : id);
  };

  const getStatus = (occupied, total) => {
    if (total === 0 || occupied === 0) return { label: 'Empty', class: 'empty' };
    if (occupied === total) return { label: 'Full', class: 'full' };
    return { label: 'Partial', class: 'partial' };
  };

  const handleDeckClick = (data) => {
    setSelectedDeck(data);
  };

  const handleCheckOut = (data) => {
    if (!data.deck.occupant_id) {
      alert('No occupant on this deck.');
      return;
    }
    setConfirmCheckout(data);
  };

  const handleConfirmCheckout = () => {
    if (!confirmCheckout?.deck?.occupant_id) return;
    checkOutMutation.mutate(confirmCheckout.deck.occupant_id);
  };

  const handleTransfer = () => {
    // Placeholder until transfer wizard is built
  };

  const handleAddOccupant = (data) => {
    setAddOccupantDeck(data);
    setSelectedDeck(null);
  };

  if (!selectedBuilding) return <p className="welcome">Select a building first.</p>;
  if (!selectedFloor) return <p className="welcome">Go to Floors and select one.</p>;

  if (isLoading) return <p>Loading rooms...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error.message}</p>;

  return (
    <div className="rooms-page">
      <h2>
        🛏️ {selectedBuilding.name} — {selectedFloor.name} — Rooms
      </h2>
      <p className="welcome">
        Click a room card to expand. Then click any deck to view or manage it.
      </p>

      {rooms.length === 0 ? (
        <div className="empty-state">
          <p>No rooms on this floor yet.</p>
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room) => {
            const status = getStatus(room.occupied_decks, room.total_decks);
            const isExpanded = expandedRoom === room.id;
            return (
              <div
                key={room.id}
                className={`room-card ${status.class} ${
                  isExpanded ? 'expanded' : ''
                }`}
              >
                <div
                  className="room-summary"
                  onClick={() => toggleRoom(room.id)}
                >
                  <div className="room-summary-left">
                    <h3>Room {room.name}</h3>
                  </div>
                  <div className="room-summary-right">
                    <span className="occupancy-tag">
                      {room.occupied_decks}/{room.total_decks}
                    </span>
                    <span className="status-badge">{status.label}</span>
                    <span className="expand-icon">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <RoomMap
                    room={room}
                    floor={selectedFloor}
                    building={selectedBuilding}
                    onDeckClick={handleDeckClick}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedDeck && (
        <DeckDetailSheet
          data={selectedDeck}
          onClose={() => setSelectedDeck(null)}
          onCheckOut={handleCheckOut}
          onTransfer={handleTransfer}
          onAddOccupant={handleAddOccupant}
        />
      )}

      {confirmCheckout && (
        <ConfirmModal
          variant="danger"
          title="Check Out Occupant?"
          message={`This will remove ${
            confirmCheckout.deck.occupant_name || 'this occupant'
          } from ${confirmCheckout.deck.position} deck of ${
            confirmCheckout.bed.name
          } in Room ${confirmCheckout.room.name}. The deck will become vacant.`}
          confirmLabel="Yes, Check Out"
          cancelLabel="Keep"
          loading={checkOutMutation.isPending}
          onConfirm={handleConfirmCheckout}
          onCancel={() => setConfirmCheckout(null)}
        />
      )}

      {addOccupantDeck && (
  <AddOccupantModal
    preselectedDeckId={addOccupantDeck.deck.id}
    onClose={() => setAddOccupantDeck(null)}
    onSuccess={() => setAddOccupantDeck(null)}
  />
)}
    </div>
  );
};

export default Rooms;