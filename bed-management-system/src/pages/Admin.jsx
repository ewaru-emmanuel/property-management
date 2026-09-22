import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useBuildings } from '../context/BuildingsContext';
import BuildingProfileSheet from '../components/BuildingProfileSheet';
import AddEditBuildingWizard from '../components/AddEditBuildingWizard';
import '../styles/admin.css';
import '../styles/occupant.css';

const Admin = () => {
  const { buildings, refreshBuildings } = useBuildings();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState('buildings');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  const tabs = [
    { id: 'buildings', label: 'Buildings' },
    { id: 'floors', label: ' Floors' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'occupants', label: 'Occupants' },
    { id: 'payments', label: 'Payments' },
    { id: 'users', label: 'Users' },
  ];

  // ---------- Wizard handlers ----------
  const handleOpenAdd = () => {
    setEditingBuilding(null);
    setWizardOpen(true);
  };

  const handleOpenEdit = (building) => {
    setSelectedBuilding(null);
    setEditingBuilding(building);
    setWizardOpen(true);
  };

  const handleWizardClose = () => {
    setWizardOpen(false);
    setEditingBuilding(null);
  };

  const handleWizardSaved = async (result, wasEditing) => {
    const cacheKey = ['buildings'];
    const previous = qc.getQueryData(cacheKey);

    // Optimistic update
    if (wasEditing) {
      qc.setQueryData(cacheKey, (old = []) =>
        old.map((b) => (b.id === editingBuilding.id ? result : b))
      );
    } else {
      qc.setQueryData(cacheKey, (old = []) => [result, ...old]);
    }

    // Close wizard
    setWizardOpen(false);
    setEditingBuilding(null);

    // Refresh from server in the background
    try {
      await refreshBuildings();
    } catch (err) {
      if (previous) qc.setQueryData(cacheKey, previous);
      alert('Failed to refresh buildings: ' + err.message);
    }
  };

  // ---------- Delete building ----------
  const handleDelete = async (id) => {
    if (
      !window.confirm('Delete this building? Everything inside will be removed.')
    )
      return;

    const cacheKey = ['buildings'];
    const previous = qc.getQueryData(cacheKey);

    qc.setQueryData(cacheKey, (old = []) => old.filter((b) => b.id !== id));

    try {
      await api.delete(`/api/buildings/${id}`);
      await refreshBuildings();
    } catch (err) {
      if (previous) qc.setQueryData(cacheKey, previous);
      alert('Failed to delete: ' + err.message);
    }
    setSelectedBuilding(null);
  };

  // ============================================================
  //  TAB CONTENT
  // ============================================================
  const renderTabContent = () => {
    switch (activeTab) {
      case 'buildings':
        return (
          <>
            <div className="admin-section-header">
              <h3>Buildings Management</h3>
              <button className="add-btn" onClick={handleOpenAdd}>
                Add Building
              </button>
            </div>

            {buildings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <h3>No buildings yet</h3>
                <p>Click "Add Building" to create your first building.</p>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Address</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildings.map((b) => (
                      <tr
                        key={b.id}
                        className="building-row"
                        style={b._optimistic ? { opacity: 0.6 } : undefined}
                        onClick={() => setSelectedBuilding(b)}
                      >
                        <td data-label="Name" className="cell-name">
                          <div className="occupant-avatar">
                            {(b.name || '?')[0].toUpperCase()}
                          </div>
                          <span className="occupant-name-text">
                            {b.name}
                          </span>
                        </td>
                        <td data-label="Address">{b.address || '—'}</td>
                        <td data-label="Description">
                          {b.description || '—'}
                        </td>
                        <td data-label="Actions">
                          <button
                            className="action-btn edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(b);
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(b.id);
                            }}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        );
      case 'floors':
        return <PlaceholderSection title="Floors Management" />;
      case 'rooms':
        return <PlaceholderSection title="Rooms Management" />;
      case 'occupants':
        return <PlaceholderSection title="Occupants Management" />;
      case 'payments':
        return <PlaceholderSection title="Payments Management" />;
      case 'users':
        return <PlaceholderSection title="Users Management" />;
      default:
        return null;
    }
  };

  // ============================================================
  //  RENDER
  // ============================================================
  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h2>Admin Panel</h2>
          <p className="welcome">Manage everything in your system from one place.</p>
        </div>
      </div>

      <div className="admin-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-content">{renderTabContent()}</div>

      {/* ---------- Rich Building Profile Sheet ---------- */}
      {selectedBuilding && (
        <BuildingProfileSheet
          building={selectedBuilding}
          onClose={() => setSelectedBuilding(null)}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
        />
      )}

      {/* ---------- Add / Edit Building Wizard ---------- */}
      {wizardOpen && (
        <AddEditBuildingWizard
          building={editingBuilding}
          onClose={handleWizardClose}
          onSaved={handleWizardSaved}
        />
      )}
    </div>
  );
};

// ============================================================
//  PLACEHOLDER SECTION
// ============================================================
const PlaceholderSection = ({ title }) => (
  <div className="placeholder-section">
    <div className="placeholder-icon">🚧</div>
    <h3>{title}</h3>
    <p>This section is coming soon. Stay tuned!</p>
  </div>
);

export default Admin;