import React, { useState } from 'react';
import '../styles/bedModal.css';

const BedModal = ({ room, bed, deck, onClose, onCheckIn, onCheckOut }) => {
  const [formData, setFormData] = useState({
    name: '',
    paid: 0,
    balance: 0,
    checkIn: new Date().toLocaleDateString(),
  });

  const isOccupied = deck.status === 'Occupied';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };     

  const handleCheckIn = () => {
    if (!formData.name.trim()) {
      alert('Please enter occupant name');
      return;
    }
    onCheckIn({
      room: room.number,
      bed: bed.number,
      deck: deck.position,
      ...formData,
    });
  };

  const handleCheckOut = () => {
    if (window.confirm(`Check out ${deck.occupant} from ${room.number} - Bed ${bed.number} (${deck.position})?`)) {
      onCheckOut({
        room: room.number,
        bed: bed.number,
        deck: deck.position,
        occupant: deck.occupant,
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bed-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            🛏️ {room.number} — Bed {bed.number} ({deck.position})
          </h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="bed-info">
          <p><strong>Status:</strong> {isOccupied ? '🔴 Occupied' : '🟢 Vacant'}</p>
          {isOccupied && (
            <>
              <p><strong>Occupant:</strong> {deck.occupant}</p>
              <p><strong>Paid:</strong> ${deck.paid}</p>
              <p><strong>Balance:</strong> ${deck.balance}</p>
            </>
          )}
        </div>

        {isOccupied ? (
          <div className="modal-actions">
            <button className="checkout-btn" onClick={handleCheckOut}>
              🚪 Check Out
            </button>
            <button className="cancel-btn" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label>Occupant Name *</label>
              <input
                type="text"
                name="name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Amount Paid ($)</label>
              <input
                type="number"
                name="paid"
                placeholder="Enter amount paid"
                value={formData.paid}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Balance ($)</label>
              <input
                type="number"
                name="balance"
                placeholder="Enter balance if any"
                value={formData.balance}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Check-in Date</label>
              <input
                type="text"
                name="checkIn"
                value={formData.checkIn}
                readOnly
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="checkin-btn" onClick={handleCheckIn}>
                ✅ Check In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BedModal;