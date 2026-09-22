import React from 'react';
import { useCurrency } from '../hooks/useCurrency';
import '../styles/profileSheet.css';
import '../styles/occupant.css';

const DeckDetailSheet = ({
  data,
  onClose,
  onCheckOut,
  onTransfer,
  onAddOccupant,
}) => {
  const { room, floor, building, bed, deck, isOccupied } = data;
  const { format: formatMoney } = useCurrency();

  return (
    <div className="occupant-sheet-overlay" onClick={onClose}>
      <div className="occupant-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />

        {/* Header */}
        <div className="sheet-header">
          <div className="occupant-avatar large">
            {(deck.occupant_name || '?')[0].toUpperCase()}
          </div>
          <h3>{isOccupied ? deck.occupant_name : 'Vacant Deck'}</h3>
          <p className="building-address">
            {building.name} · Room {room.name} · {bed.name} · {deck.position}
          </p>
          <span
            className={`status-badge ${isOccupied ? 'active' : 'inactive'}`}
            style={{ marginTop: 8 }}
          >
            {deck.status}
          </span>
        </div>

        {/* Details */}
        <div className="sheet-details">
          <div className="sheet-row">
            <span className="sheet-label">📍 Floor</span>
            <span>{floor.name}</span>
          </div>
          <div className="sheet-row">
            <span className="sheet-label">🚪 Room</span>
            <span>{room.name}</span>
          </div>
          <div className="sheet-row">
            <span className="sheet-label">🛏️ Bed</span>
            <span>{bed.name}</span>
          </div>
          <div className="sheet-row">
            <span className="sheet-label">🔝 Position</span>
            <span>{deck.position}</span>
          </div>

          {isOccupied && (
            <>
              <div className="sheet-row">
                <span className="sheet-label">📞 Phone</span>
                <span>{deck.occupant_phone || '—'}</span>
              </div>
              <div className="sheet-row">
                <span className="sheet-label">💰 Last Paid</span>
                <span>{formatMoney(deck.last_paid || 0)}</span>
              </div>
              <div className="sheet-row">
                <span className="sheet-label">⚖️ Balance</span>
                <span
                  style={{
                    color: deck.balance > 0 ? '#ef4444' : '#22c55e',
                    fontWeight: 600,
                  }}
                >
                  {formatMoney(deck.balance || 0)}
                </span>
              </div>
            </>
          )}
        </div>

                {/* Actions */}
        {isOccupied ? (
          <div className="deck-actions-row">
            <button
              className="deck-action-btn transfer"
              onClick={() => onTransfer(data)}
              disabled
              title="Transfer is coming soon"
            >
              🔄 Transfer
            </button>
            <button
              className="deck-action-btn checkout"
              onClick={() => onCheckOut(data)}
            >
              🚪 Check Out
            </button>
          </div>
        ) : (
          <div className="deck-actions-row">
            <button
              className="deck-action-btn add-occupant"
              onClick={() => onAddOccupant(data)}
            >
              Add Occupant
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckDetailSheet;