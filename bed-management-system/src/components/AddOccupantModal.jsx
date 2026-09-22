import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useBuildings } from '../context/BuildingsContext';
import '../styles/occupant.css';

const todayISO = () => new Date().toISOString().split('T')[0];   // YYYY-MM-DD

const AddOccupantModal = ({
  preselectedDeckId = null,
  onClose,
  onSuccess,
}) => {
  const { selectedBuilding } = useBuildings();
  const qc = useQueryClient();

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    emergency_contact: '',
    deck_id: preselectedDeckId || '',
    check_in_date: todayISO(),
  });

  const { data: vacantDecks = [] } = useQuery({
    queryKey: ['decks', selectedBuilding?.id],
    queryFn: () =>
      api.get(`/api/occupants/vacant-decks?building_id=${selectedBuilding.id}`),
    enabled: !!selectedBuilding,
  });

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
      if (ctx?.previous)
        qc.setQueryData(['occupants', selectedBuilding.id], ctx.previous);
      if (ctx?.previousDecks)
        qc.setQueryData(['decks', selectedBuilding.id], ctx.previousDecks);
      alert('Failed to add occupant');
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['occupants', selectedBuilding.id] });
      qc.invalidateQueries({ queryKey: ['decks', selectedBuilding.id] });
      qc.invalidateQueries({ queryKey: ['stats', selectedBuilding.id] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({ queryKey: ['building-tree'] });
    },
  });

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
      check_in_date: formData.check_in_date,   // already YYYY-MM-DD
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        onSuccess?.();
        onClose?.();
      },
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Check In New Occupant</h3>
          <button className="modal-close" onClick={onClose}>
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
              type="date"                          // ← forces ISO format
              name="check_in_date"
              value={formData.check_in_date}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving...' : 'Check In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOccupantModal;