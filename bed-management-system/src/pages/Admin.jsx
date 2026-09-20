import React, { useState } from 'react';
import { api } from '../lib/api';
import { useBuildings } from '../context/BuildingsContext';
import '../styles/admin.css';

const Admin = () => {
  const { buildings, refreshBuildings } = useBuildings();

  const [activeTab, setActiveTab] = useState('buildings');
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    floors: [],
  });

  // Temporary per-step inputs
  const [floorCount, setFloorCount] = useState(1);
  const [roomCounts, setRoomCounts] = useState({});
  const [bedCounts, setBedCounts] = useState({});
  const [deckCounts, setDeckCounts] = useState({});

  const tabs = [
    { id: 'buildings', label: 'Buildings' },
    { id: 'floors', label: ' Floors' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'occupants', label: 'Occupants' },
    { id: 'payments', label: 'Payments' },
    { id: 'users', label: 'Users' },
  ];

  // Reset form
  const resetForm = () => {
    setFormData({ name: '', address: '', description: '', floors: [] });
    setFloorCount(1);
    setRoomCounts({});
    setBedCounts({});
    setDeckCounts({});
    setStep(1);
    setSaving(false);
  };

  const handleAddNew = () => {
    resetForm();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  // Step 1 → build initial floors array
  const handleStep1Next = () => {
    if (!formData.name.trim()) {
      alert('Please enter a building name');
      return;
    }

    const floors = Array.from({ length: Number(floorCount) }, (_, i) => ({
      id: `floor-${i + 1}`,
      name: `Floor ${i + 1}`,
      rooms: [],
    }));

    const initialRoomCounts = {};
    floors.forEach((f) => (initialRoomCounts[f.id] = 1));
    setRoomCounts(initialRoomCounts);

    setFormData({ ...formData, floors });
    setStep(2);
  };

  // Step 2 → build rooms
  const handleStep2Next = () => {
    const updatedFloors = formData.floors.map((floor) => {
      const count = Number(roomCounts[floor.id] || 1);
      return {
        ...floor,
        rooms: Array.from({ length: count }, (_, i) => ({
          id: `${floor.id}-room-${i + 1}`,
          name: `${floor.name.replace('Floor ', '')}${String(i + 1).padStart(2, '0')}`,
          beds: [],
        })),
      };
    });

    const initialBedCounts = {};
    updatedFloors.forEach((floor) =>
      floor.rooms.forEach((room) => (initialBedCounts[room.id] = 1))
    );
    setBedCounts(initialBedCounts);

    setFormData({ ...formData, floors: updatedFloors });
    setStep(3);
  };

  // Step 3 → build beds
  const handleStep3Next = () => {
    const updatedFloors = formData.floors.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => {
        const count = Number(bedCounts[room.id] || 1);
        return {
          ...room,
          beds: Array.from({ length: count }, (_, i) => ({
            id: `${room.id}-bed-${i + 1}`,
            name: `Bed ${i + 1}`,
            decks: [],
          })),
        };
      }),
    }));

    const initialDeckCounts = {};
    updatedFloors.forEach((floor) =>
      floor.rooms.forEach((room) =>
        room.beds.forEach((bed) => (initialDeckCounts[bed.id] = 3))
      )
    );
    setDeckCounts(initialDeckCounts);

    setFormData({ ...formData, floors: updatedFloors });
    setStep(4);
  };

  // Step 4 → submit to backend
  const handleFinalSubmit = async () => {
    setSaving(true);

    const updatedFloors = formData.floors.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => ({
        ...room,
        beds: room.beds.map((bed) => {
          const count = Number(deckCounts[bed.id] || 3);
          const positions = ['Upper', 'Middle', 'Lower'].slice(0, count);
          return {
            ...bed,
            decks: positions.map((pos) => ({
              position: pos,
              monthly_rate: 0,
            })),
          };
        }),
      })),
    }));

    const payload = {
      name: formData.name,
      address: formData.address,
      description: formData.description,
      floors: updatedFloors.map((floor, index) => ({
        name: floor.name,
        floor_number: index + 1,
        rooms: floor.rooms.map((room) => ({
          name: room.name,
          room_type: null,
          beds: room.beds.map((bed) => ({
            name: bed.name,
            decks: bed.decks,
          })),
        })),
      })),
    };

    try {
      await api.post('/api/buildings', payload);
      await refreshBuildings();
      handleCloseModal();
    } catch (err) {
      alert('Failed to save building: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this building? All floors, rooms, and beds inside will also be removed.')) {
      return;
    }

    try {
      await api.delete(`/api/buildings/${id}`);
      await refreshBuildings();
    } catch (err) {
      alert('Failed to delete building: ' + err.message);
    }
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'buildings':
        return (
          <>
            <div className="admin-section-header">
              <h3>Buildings Management</h3>
              <button className="add-btn" onClick={handleAddNew}>
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
                      <tr key={b.id}>
                        <td><strong>{b.name}</strong></td>
                        <td>{b.address || '—'}</td>
                        <td>{b.description || '—'}</td>
                        <td>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDelete(b.id)}
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
        return <PlaceholderSection  title="Occupants Management" />;
      case 'payments':
        return <PlaceholderSection  title="Payments Management" />;
      case 'users':
        return <PlaceholderSection  title="Users Management" />;
      default:
        return null;
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h2>Admin Panel</h2>
          <p className="welcome">Manage everything in your system from one place.</p>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Add New Building
                <span className="step-indicator">Step {step} of 4</span>
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>✕</button>
            </div>

            {/* Step 1: Building Info */}
            {step === 1 && (
              <>
                <div className="form-group">
                  <label>Building Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., apollo apartments annex"
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g., E13 road, plot 25"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional notes about this building"
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Number of Floors *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={floorCount}
                    onChange={(e) => setFloorCount(e.target.value)}
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button type="button" className="submit-btn" onClick={handleStep1Next}>
                    Next →
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Rooms per Floor */}
            {step === 2 && (
              <>
                <p className="step-description">How many rooms on each floor?</p>
                {formData.floors.map((floor) => (
                  <div key={floor.id} className="form-group">
                    <label>{floor.name} — Number of Rooms</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={roomCounts[floor.id] || 1}
                      onChange={(e) =>
                        setRoomCounts({ ...roomCounts, [floor.id]: e.target.value })
                      }
                    />
                  </div>
                ))}

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={() => setStep(1)}>
                    ← Back
                  </button>
                  <button type="button" className="submit-btn" onClick={handleStep2Next}>
                    Next →
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Beds per Room */}
            {step === 3 && (
              <>
                <p className="step-description">How many beds in each room?</p>
                {formData.floors.map((floor) => (
                  <div key={floor.id} className="floor-group">
                    <h4 className="group-title">{floor.name}</h4>
                    {floor.rooms.map((room) => (
                      <div key={room.id} className="form-group">
                        <label>Room {room.name} — Number of Beds</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={bedCounts[room.id] || 1}
                          onChange={(e) =>
                            setBedCounts({ ...bedCounts, [room.id]: e.target.value })
                          }
                        />
                      </div>
                    ))}
                  </div>
                ))}

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={() => setStep(2)}>
                    ← Back
                  </button>
                  <button type="button" className="submit-btn" onClick={handleStep3Next}>
                    Next →
                  </button>
                </div>
              </>
            )}

            {/* Step 4: Decks per Bed */}
            {step === 4 && (
              <>
                <p className="step-description">
                  How many deck levels per bed? (1 = Single, 2 = Double, 3 = Triple)
                </p>
                {formData.floors.map((floor) => (
                  <div key={floor.id} className="floor-group">
                    <h4 className="group-title">{floor.name}</h4>
                    {floor.rooms.map((room) => (
                      <div key={room.id} className="room-group">
                        <h5 className="room-title">Room {room.name}</h5>
                        {room.beds.map((bed) => (
                          <div key={bed.id} className="form-group">
                            <label>{bed.name} — Decks (1–3)</label>
                            <select
                              value={deckCounts[bed.id] || 3}
                              onChange={(e) =>
                                setDeckCounts({ ...deckCounts, [bed.id]: e.target.value })
                              }
                            >
                              <option value="1">1 — Single</option>
                              <option value="2">2 — Double (Upper, Lower)</option>
                              <option value="3">3 — Triple (Upper, Middle, Lower)</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setStep(3)}
                    disabled={saving}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={handleFinalSubmit}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Create Building'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const PlaceholderSection = ({ icon, title }) => (
  <div className="placeholder-section">
    <div className="placeholder-icon">{icon}</div>
    <h3>{title}</h3>
    <p>This section is coming soon. Stay tuned!</p>
  </div>
);

export default Admin;