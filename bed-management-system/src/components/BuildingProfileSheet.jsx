import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useCurrency } from '../hooks/useCurrency';
import '../styles/profileSheet.css';

const BuildingProfileSheet = ({ building, onClose, onEdit, onDelete }) => {
  const { format: formatMoney } = useCurrency();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const tree = await api.get(`/api/buildings/${building.id}/tree`);
        setStats(tree.stats);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [building.id]);

  const initial = (building.name || '?')[0].toUpperCase();

  return (
    <div className="occupant-sheet-overlay" onClick={onClose}>
      <div className="occupant-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />

        {/* Header */}
        <div className="sheet-header">
          <div className="occupant-avatar large">{initial}</div>
          <h3>{building.name}</h3>
          {building.address && (
            <p className="building-address">📍 {building.address}</p>
          )}
        </div>

        {/* Description */}
        {building.description && (
          <p className="building-description">{building.description}</p>
        )}

        {loading ? (
          <p
            style={{
              textAlign: 'center',
              padding: 20,
              color: '#94a3b8',
            }}
          >
            Loading details...
          </p>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <div className="building-stats-grid">
              <div className="stat-box">
                <span className="stat-box-label">Floors</span>
                <span className="stat-box-value">{stats.total_floors}</span>
              </div>
              <div className="stat-box">
                <span className="stat-box-label">Rooms</span>
                <span className="stat-box-value">{stats.total_rooms}</span>
              </div>
              <div className="stat-box">
                <span className="stat-box-label">Beds</span>
                <span className="stat-box-value">{stats.total_beds}</span>
              </div>
              <div className="stat-box">
                <span className="stat-box-label">Occupants</span>
                <span className="stat-box-value">{stats.total_occupants}</span>
              </div>
            </div>

            {/* Occupancy Bar */}
            <div className="occupancy-block">
              <div className="occupancy-header">
                <span>Occupancy</span>
                <span className="occupancy-percent">
                  {stats.occupancy_rate}%
                </span>
              </div>
              <div className="occupancy-bar">
                <div
                  className="occupancy-fill"
                  style={{ width: `${stats.occupancy_rate}%` }}
                />
              </div>
              <div className="occupancy-legend">
                <span>🟢 {stats.vacant_decks} vacant</span>
                <span>🔴 {stats.occupied_decks} occupied</span>
              </div>
            </div>

            {/* Financials — uses user's currency from Settings */}
            <div className="building-financials">
              <div className="finance-item">
                <span className="finance-label">💰 Total Paid</span>
                <span className="finance-value paid">
                  {formatMoney(stats.total_paid)}
                </span>
              </div>
              <div className="finance-item">
                <span className="finance-label">⏳ Pending</span>
                <span className="finance-value pending">
                  {formatMoney(stats.total_pending)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <p
            style={{
              textAlign: 'center',
              padding: 20,
              color: '#94a3b8',
            }}
          >
            No stats available.
          </p>
        )}

        {/* Actions */}
        <div className="sheet-actions">
          <button className="sheet-edit-btn" onClick={() => onEdit(building)}>
            ✏️ Edit Building
          </button>
          <button
            className="sheet-delete-btn"
            onClick={() => onDelete(building.id)}
          >
            🗑️ Delete Building
          </button>
          <button className="sheet-cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuildingProfileSheet;