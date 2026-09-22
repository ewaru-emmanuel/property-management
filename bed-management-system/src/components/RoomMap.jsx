import React from 'react';
import '../styles/roomMap.css';

const RoomMap = ({ room, floor, building, onDeckClick }) => {
  const beds = room.beds || [];

  const totalDecks = beds.reduce((sum, b) => sum + (b.decks?.length || 0), 0);
  const occupiedDecks = beds.reduce(
    (sum, b) =>
      sum + (b.decks?.filter((d) => d.status === 'Occupied').length || 0),
    0
  );

  return (
    <div className="room-map">
      <div className="room-map-header">
        <div className="room-map-title">ROOM {room.name}</div>
        <div className="room-map-subtitle">
          📍 {floor.name} · {building.name}
        </div>
        <div className="room-map-occupancy">
          {occupiedDecks} of {totalDecks} decks occupied
        </div>
      </div>

      {beds.length === 0 ? (
        <div className="room-map-empty">
          <p>No beds in this room yet.</p>
        </div>
      ) : (
        <div className="iso-beds">
          {beds.map((bed, bedIdx) => (
            <div key={bed.id || bedIdx} className="iso-bed">
              <div className="iso-bed-label">
                Bed {bed.name || bedIdx + 1}
              </div>
              <div className="iso-stack">
                {(bed.decks || []).map((deck) => {
                  const isOccupied = deck.status === 'Occupied';
                  return (
                    <div
                      key={deck.id}
                      className={`iso-deck ${isOccupied ? 'occupied' : 'vacant'}`}
                      title={`${deck.position} deck — ${
                        isOccupied ? deck.occupant_name || 'Occupied' : 'Vacant'
                      }`}
                      onClick={() =>
                        onDeckClick?.({
                          room,
                          floor,
                          building,
                          bed,
                          deck,
                          isOccupied,
                        })
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onDeckClick?.({
                            room,
                            floor,
                            building,
                            bed,
                            deck,
                            isOccupied,
                          });
                        }
                      }}
                    >
                      <div className="iso-deck-top" />
                      <div className="iso-deck-side" />
                      <div className="iso-deck-front">
                        <span className="iso-deck-position">
                          {deck.position}
                        </span>
                        <span className="iso-deck-status">
                          {isOccupied
                            ? `👤 ${deck.occupant_name || 'Occupied'}`
                            : '○ Vacant'}
                        </span>
                        {isOccupied && deck.balance > 0 && (
                          <span className="iso-deck-balance">
                            ⚠️ ${deck.balance}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="room-map-footer">
        <div className="map-stat">
          <span className="map-stat-value">{beds.length}</span>
          <span className="map-stat-label">Beds</span>
        </div>
        <div className="map-stat">
          <span className="map-stat-value">{totalDecks}</span>
          <span className="map-stat-label">Decks</span>
        </div>
        <div className="map-stat">
          <span className="map-stat-value">{occupiedDecks}</span>
          <span className="map-stat-label">Occupied</span>
        </div>
        <div className="map-stat">
          <span className="map-stat-value">
            {totalDecks - occupiedDecks}
          </span>
          <span className="map-stat-label">Free</span>
        </div>
      </div>
    </div>
  );
};

export default RoomMap;