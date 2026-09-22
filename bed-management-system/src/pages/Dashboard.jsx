import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useBuildings } from '../context/BuildingsContext';
import { useCurrency } from '../hooks/useCurrency';

function Dashboard() {
  const { selectedBuilding } = useBuildings();
  const { format: formatMoney } = useCurrency();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['stats', selectedBuilding?.id],
    queryFn: () => api.get(`/api/buildings/${selectedBuilding.id}/stats`),
    enabled: !!selectedBuilding,
  });

  if (!selectedBuilding) {
    return (
      <div className="dashboard">
        <div className="page-heading">
          <h1>📊 Dashboard</h1>
          <p>Select or create a building to see stats.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-heading">
        <h1>🏢 {selectedBuilding.name} — Dashboard</h1>
        <p>Welcome back, Admin!</p>
      </div>

      {isLoading && <p>Loading stats...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}

      {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Floors</span>
              <strong>{stats.total_floors}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Rooms</span>
              <strong>{stats.total_rooms}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Occupied</span>
              <strong>{stats.occupied_beds}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Available</span>
              <strong>{stats.available_beds}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Beds</span>
              <strong>{stats.total_beds}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Occupants</span>
              <strong>{stats.total_occupants}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Paid</span>
              <strong>{formatMoney(stats.total_paid)}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Pending Balance</span>
              <strong style={{ color: '#f59e0b' }}>
                {formatMoney(stats.total_pending)}
              </strong>
            </div>
          </div>

          <section className="activity-section">
            <h2>📋 Recent Activity</h2>
            <div className="activity-list">
              <div className="activity-item">
                <span>{stats.total_occupants}</span>
                <span>→ Active occupants</span>
              </div>
              <div className="activity-item">
                <span>{stats.occupied_beds}</span>
                <span>→ Beds currently occupied</span>
              </div>
              <div className="activity-item">
                <span>{formatMoney(stats.total_pending)}</span>
                <span>→ Outstanding balance</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Dashboard;