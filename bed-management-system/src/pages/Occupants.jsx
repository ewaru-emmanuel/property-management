import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useBuildings } from '../context/BuildingsContext';
import '../styles/occupant.css';

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Occupants = () => {
  const { selectedBuilding } = useBuildings();
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingOccupant, setEditingOccupant] = useState(null);   // null = add mode
  const [selectedOccupant, setSelectedOccupant] = useState(null); // bottom sheet
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    emergency_contact: '',
    deck_id: '',
    check_in_date: new Date().toLocaleDateString(),
    status: 'Active',
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
  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/api/occupants', payload),

    onMutate: async (newOcc) => {
      const key = ['occupants', selectedBuilding.id];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData(key);

      const deckInfo = vacantDecks.find((d) => d.deck_id === newOcc.deck_id);
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
      qc.setQueryData(['decks', selectedBuilding.id], (old = []) =>
        old.filter((d) => d.deck_id !== newOcc.deck_id)
      );

      return { previous, previousDecks: vacantDecks };
    },

    onError: (_err, _newOcc, ctx) => {
      if (ctx?.previous) qc.setQueryData(['occupants', selectedBuilding.id], ctx.previous);
      if (ctx?.previousDecks) qc.setQueryData(['decks', selectedBuilding.id], ctx.previousDecks);
      alert('Failed to add occupant');
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['occupants', selectedBuilding.id] });
      qc.invalidateQueries({ queryKey: ['decks', selectedBuilding.id] });
      qc.invalidateQueries({ queryKey: ['stats', selectedBuilding.id] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/api/occupants/${id}`, payload),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['occupants'] });
      qc.invalidateQueries({ queryKey: ['decks'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => alert('Failed to update: ' + err.message),
  });

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
      if (ctx?.previous) qc.setQueryData(['occupants', selectedBuilding.id], ctx.previous);
      alert('Failed to delete occupant');
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['occupants', selectedBuilding.id] });
      qc.invalidateQueries({ queryKey: ['decks', selectedBuilding.id] });
      qc.invalidateQueries({ queryKey: ['stats', selectedBuilding.id] });
    },
  });

  // ---------- Handlers ----------

  // Open modal in ADD mode
  const handleOpenAdd = () => {
    setEditingOccupant(null);
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      emergency_contact: '',
      deck_id: '',
      check_in_date: new Date().toLocaleDateString(),
      status: 'Active',
    });
    setShowModal(true);
  };

  // Open modal in EDIT mode
  const handleOpenEdit = (occupant) => {
    setEditingOccupant(occupant);
    setFormData({
      full_name: occupant.full_name || '',
      phone: occupant.phone || '',
      email: occupant.email || '',
      emergency_contact: occupant.emergency_contact || '',
      deck_id: occupant.deck_id || '',
      check_in_date: occupant.check_in_date || '',
      status: occupant.status || 'Active',
    });
    setSelectedOccupant(null); // close sheet if open
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedBuilding) return;

    if (editingOccupant) {
      // EDIT
      const payload = {
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email,
        emergency_contact: formData.emergency_contact,
        check_in_date: formData.check_in_date,
        status: formData.status,
        deck_id: formData.deck_id || undefined,
      };
      updateMutation.mutate(
        { id: editingOccupant.id, payload },
        {
          onSuccess: () => {
            setShowModal(false);
            setEditingOccupant(null);
          },
        }
      );
    } else {
      // ADD
      const payload = {
        building_id: selectedBuilding.id,
        deck_id: formData.deck_id || null,
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email,
        emergency_contact: formData.emergency_contact,
        check_in_date: formData.check_in_date,
      };
      createMutation.mutate(payload);
      setShowModal(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this occupant?')) {
      deleteMutation.mutate(id);
      setSelectedOccupant(null);
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

  // Decks shown in edit mode: all vacant + the occupant's current deck
  const deckOptions = editingOccupant
    ? [
        ...(editingOccupant.deck_id
          ? [{
              deck_id: editingOccupant.deck_id,
              label: `${editingOccupant.floor_name || ''} → Room ${editingOccupant.room_name || ''} → ${editingOccupant.bed_name || ''} (${editingOccupant.deck_position || ''})`,
            }]
          : []),
        ...vacantDecks,
      ]
    : vacantDecks;

  return (
    <div className="occupants-page">
      <div className="occupants-header">
        <div>
          <h2>{selectedBuilding.name} — Occupants</h2>
          <p className="welcome">Manage all occupants in this building.</p>
        </div>
        <button className="add-occupant-btn" onClick={handleOpenAdd}>
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
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((o) => (
                  <tr
                    key={o.id}
                    style={o._optimistic ? { opacity: 0.6 } : undefined}
                    className="occupant-row"
                    onClick={() => setSelectedOccupant(o)}
                  >
                    <td data-label="Name" className="cell-name">
                      <div className="occupant-avatar">
                        {getInitials(o.full_name)}
                      </div>
                      <span className="occupant-name-text">{o.full_name}</span>
                    </td>
                    <td data-label="Floor">{o.floor_name || '—'}</td>
                    <td data-label="Room">{o.room_name || '—'}</td>
                    <td data-label="Bed">{o.bed_name || '—'}</td>
                    <td data-label="Deck">{o.deck_position || '—'}</td>
                    <td data-label="Phone">{o.phone || '—'}</td>
                    <td data-label="Status">
                      <span className={`status-badge ${o.status?.toLowerCase()}`}>
                        {o.status}
                      </span>
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

      {/* ---------- Bottom Sheet (mobile/tablet) ---------- */}
      {selectedOccupant && (
        <div
          className="occupant-sheet-overlay"
          onClick={() => setSelectedOccupant(null)}
        >
          <div className="occupant-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />

            <div className="sheet-header">
              <div className="occupant-avatar large">
                {getInitials(selectedOccupant.full_name)}
              </div>
              <h3>{selectedOccupant.full_name}</h3>
              <span className={`status-badge ${selectedOccupant.status?.toLowerCase()}`}>
                {selectedOccupant.status}
              </span>
            </div>

            <div className="sheet-details">
              <div className="sheet-row">
                <span className="sheet-label"> Floor</span>
                <span>{selectedOccupant.floor_name || '—'}</span>
              </div>
              <div className="sheet-row">
                <span className="sheet-label">Room</span>
                <span>{selectedOccupant.room_name || '—'}</span>
              </div>
              <div className="sheet-row">
                <span className="sheet-label">Bed / Deck</span>
                <span>
                  {selectedOccupant.bed_name || '—'}
                  {selectedOccupant.deck_position
                    ? ` · ${selectedOccupant.deck_position}`
                    : ''}
                </span>
              </div>
              <div className="sheet-row">
                <span className="sheet-label">Phone</span>
                <span>{selectedOccupant.phone || '—'}</span>
              </div>
              <div className="sheet-row">
                <span className="sheet-label">Email</span>
                <span>{selectedOccupant.email || '—'}</span>
              </div>
              <div className="sheet-row">
                <span className="sheet-label">Emergency</span>
                <span>{selectedOccupant.emergency_contact || '—'}</span>
              </div>
              <div className="sheet-row">
                <span className="sheet-label">Check-in</span>
                <span>{selectedOccupant.check_in_date || '—'}</span>
              </div>
            </div>

            <div className="sheet-actions">
              <button
                className="sheet-edit-btn"
                onClick={() => handleOpenEdit(selectedOccupant)}
              >
                Edit Occupant
              </button>
              <button
                className="sheet-delete-btn"
                onClick={() => handleDelete(selectedOccupant.id)}
              >
                Delete Occupant
              </button>
              <button
                className="sheet-cancel-btn"
                onClick={() => setSelectedOccupant(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Add / Edit Modal ---------- */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingOccupant ? 'Edit Occupant' : 'Check In New Occupant'}</h3>
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
                <label>{editingOccupant ? 'Assigned Deck (change if moving)' : 'Assign to Vacant Deck *'}</label>
                <select
                  name="deck_id"
                  value={formData.deck_id}
                  onChange={handleInputChange}
                  required={!editingOccupant}
                >
                  <option value="">-- Select deck --</option>
                  {deckOptions.map((d) => (
                    <option key={d.deck_id} value={d.deck_id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Check-in Date</label>
                  <input
                    type="text"
                    name="check_in_date"
                    value={formData.check_in_date}
                    onChange={handleInputChange}
                  />
                </div>
                {editingOccupant && (
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                )}
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
                  {editingOccupant ? 'Save Changes' : 'Check In'}
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