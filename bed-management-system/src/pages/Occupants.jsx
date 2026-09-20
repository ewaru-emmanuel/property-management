import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useBuildings } from '../context/BuildingsContext';
import '../styles/occupant.css';

const Occupants = () => {
  const { selectedBuilding } = useBuildings();
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    emergency_contact: '',
    deck_id: '',
    check_in_date: new Date().toLocaleDateString(),
  });

  // ---------- Queries ----------
  const { data: occupants = [], isLoading, error } = useQuery({
    queryKey: ['occupants', selectedBuilding?.id],
    queryFn: () => api.get(`/api/occupants?building_id=${selectedBuilding.id}`),
    enabled: !!selectedBuilding,
  });

  const { data: vacantDecks = [] } = useQuery({
    queryKey: ['decks', selectedBuilding?.id],
    queryFn: () => api.get(`/api/occupants/vacant-decks?building_id=${selectedBuilding.id}`),
    enabled: !!selectedBuilding,
  });

  // ---------- Mutations ----------

  // Add occupant — optimistic
  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/api/occupants', payload),

    onMutate: async (newOcc) => {
      const key = ['occupants', selectedBuilding.id];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData(key);

      // Try to derive display info from the chosen deck label
      const deckInfo = vacantDecks.find((d) => d.deck_id === newOcc.deck_id);
      // Label format: "Floor 1 → Room 101 → Bed 1 (Upper)"
      let floorName = '';
      let roomName = '';
      let bedName = '';
      let deckPosition = '';
      if (deckInfo?.label) {
        const parts = deckInfo.label.split('→').map((s) => s.trim());
        floorName = parts[0] || '';
        roomName = (parts[1] || '').replace('Room ', '');
        bedName = (parts[2] || '').split('(')[0].trim();
        deckPosition = (parts[2] || '').match(/\(([^)]+)\)/)?.[1] || '';
      }

      const optimistic = {
        id: 'temp-' + Date.now(),
        building_id: newOcc.building_id,
        full_name: newOcc.full_name,
        phone: newOcc.phone,
        email: newOcc.email,
        emergency_contact: newOcc.emergency_contact,
        deck_id: newOcc.deck_id,
        check_in_date: newOcc.check_in_date,
        status: 'Active',
        floor_name: floorName,
        room_name: roomName,
        bed_name: bedName,
        deck_position: deckPosition,
        _optimistic: true,
      };

      qc.setQueryData(key, (old = []) => [optimistic, ...old]);

      // Also remove that deck from the vacant list optimistically
      qc.setQueryData(['decks', selectedBuilding.id], (old = []) =>
        old.filter((d) => d.deck_id !== newOcc.deck_id)
      );

      return { previous, previousDecks: vacantDecks };
    },

    onError: (_err, _newOcc, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['occupants', selectedBuilding.id], ctx.previous);
      }
      if (ctx?.previousDecks) {
        qc.setQueryData(['decks', selectedBuilding.id], ctx.previousDecks);
      }
      alert('Failed to add occupant');
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['occupants', selectedBuilding.id] });
      qc.invalidateQueries({ queryKey: ['decks', selectedBuilding.id] });
      qc.invalidateQueries({ queryKey: ['stats', selectedBuilding.id] });
    },
  });

  // Delete occupant — optimistic
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/occupants/${id}`),

    onMutate: async (id) => {
      const key = ['occupants', selectedBuilding.id];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData(key);

      qc.setQueryData(key, (old = []) => old.filter((o) => o.id !== id));

      return { previous };
    },

    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['occupants', selectedBuilding.id], ctx.previous);
      }
      alert('Failed to delete occupant');
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['occupants', selectedBuilding.id] });
      qc.invalidateQueries({ queryKey: ['decks', selectedBuilding.id] });
      qc.invalidateQueries({ queryKey: ['stats', selectedBuilding.id] });
    },
  });

  // ---------- Handlers ----------
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedBuilding) return;

    const payload = {
      building_id: selectedBuilding.id,
      deck_id: formData.deck_id || null,
      full_name: formData.full_name,
      phone: formData.phone,
      email: formData.email,
      emergency_contact: formData.emergency_contact,
      check_in_date: formData.check_in_date,
    };

    // Close the modal INSTANTLY
    setShowModal(false);
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      emergency_contact: '',
      deck_id: '',
      check_in_date: new Date().toLocaleDateString(),
    });

    // Fire the mutation (optimistic add appears immediately)
    createMutation.mutate(payload, {
      onError: () => {
        // Optional: reopen modal or notify
      },
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this occupant?')) {
      deleteMutation.mutate(id);
    }
  };

  const filtered = occupants.filter((o) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      o.full_name?.toLowerCase().includes(term) ||
      o.room_name?.toLowerCase().includes(term) ||
      o.phone?.includes(term);
    const matchStatus = filterStatus === 'All' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (!selectedBuilding) {
    return (
      <div className="occupants-page">
        <h2>Occupants</h2>
        <p className="welcome">Select a building from the header.</p>
      </div>
    );
  }

  return (
    <div className="occupants-page">
      <div className="occupants-header">
        <div>
          <h2>{selectedBuilding.name} — Occupants</h2>
          <p className="welcome">Manage all occupants in this building.</p>
        </div>
        <button className="add-occupant-btn" onClick={() => setShowModal(true)}>
          Add Occupant
        </button>
      </div>

      <div className="search-filter-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-box">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <div className="results-count">
          {filtered.length} of {occupants.length}
        </div>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>Error: {error.message}</p>
      ) : (
        <div className="occupants-table-wrapper">
          <table className="occupants-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Floor</th>
                <th>Room</th>
                <th>Bed</th>
                <th>Deck</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((o) => (
                  <tr
                    key={o.id}
                    style={o._optimistic ? { opacity: 0.6 } : undefined}
                  >
                    <td>{o.full_name}</td>
                    <td>{o.floor_name || '—'}</td>
                    <td>{o.room_name || '—'}</td>
                    <td>{o.bed_name || '—'}</td>
                    <td>{o.deck_position || '—'}</td>
                    <td>{o.phone || '—'}</td>
                    <td>
                      <span className={`status-badge ${o.status?.toLowerCase()}`}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(o.id)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-results">
                    No occupants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Check In New Occupant</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Emergency Contact</label>
                <input
                  type="text"
                  name="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Assign to Vacant Deck *</label>
                <select
                  name="deck_id"
                  value={formData.deck_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">-- Select deck --</option>
                  {vacantDecks.map((d) => (
                    <option key={d.deck_id} value={d.deck_id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Check-in Date</label>
                <input
                  type="text"
                  name="check_in_date"
                  value={formData.check_in_date}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Check In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Occupants;