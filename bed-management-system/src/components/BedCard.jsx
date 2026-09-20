import React from 'react';
import '../styles/bedCard.css';

const BedCard = ({ bed, onClick }) => {
  const isOccupied = bed.status === 'Occupied';

  return (
    <div 
      className={`bed-card ${bed.position.toLowerCase()} ${isOccupied ? 'occupied' : 'vacant'}`}
      onClick={onClick}
    >
      <div className="bed-position">
        {bed.position === 'Upper' && '🔝'}
        {bed.position === 'Middle' && '🔶'}
        {bed.position === 'Lower' && '🔽'}
        <span>{bed.position}</span>
      </div>
      <div className="bed-status">
        {isOccupied ? (
          <>
            <span className="occupant-name">👤 {bed.occupant}</span>
            <span className="payment-info">${bed.paid} / ${bed.paid + bed.balance}</span>
            {bed.balance > 0 && <span className="balance">⚠️ Balance: ${bed.balance}</span>}
          </>
        ) : (
          <span className="vacant-label">🟢 Vacant</span>
        )}
      </div>
    </div>
  );
};

export default BedCard;