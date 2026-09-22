import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import '../styles/wizard.css';

const AddEditBuildingWizard = ({ building, onClose, onSaved }) => {
  const isEditing = !!building;

  const [step, setStep] = useState(1);
  const [loadingTree, setLoadingTree] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    floors: [],
  });

  // ---------- Load existing tree when editing ----------
  useEffect(() => {
    if (!building) return;

    const load = async () => {
      setLoadingTree(true);
      try {
        const tree = await api.get(`/api/buildings/${building.id}/tree`);
        setFormData({
          name: tree.name || '',
          address: tree.address || '',
          description: tree.description || '',
          floors: (tree.floors || []).map((floor) => ({
            id: floor.id,
            name: floor.name,
            rooms: (floor.rooms || []).map((room) => ({
              id: room.id,
              name: room.name,
              beds: (room.beds || []).map((bed) => ({
                id: bed.id,
                name: bed.name,
                decks: (bed.decks || []).map((deck) => ({
                  id: deck.id,
                  position: deck.position,
                })),
              })),
            })),
          })),
        });
      } catch (err) {
        alert('Failed to load building structure: ' + err.message);
        onClose();
      } finally {
        setLoadingTree(false);
      }
    };

    load();
  }, [building, onClose]);

  // ---------- Step navigation ----------
  const handleNext = () => {
    if (step === 1 && !formData.name.trim()) {
      alert('Please enter a building name');
      return;
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  // ---------- Floor actions ----------
  const addFloor = () => {
    const newFloorNum = formData.floors.length + 1;
    setFormData({
      ...formData,
      floors: [
        ...formData.floors,
        { id: null, name: `Floor ${newFloorNum}`, rooms: [] },
      ],
    });
  };

  const removeFloor = (idx) => {
    if (!window.confirm('Remove this floor and everything inside it?')) return;
    setFormData({
      ...formData,
      floors: formData.floors.filter((_, i) => i !== idx),
    });
  };

  const updateFloor = (idx, name) => {
    const floors = [...formData.floors];
    floors[idx] = { ...floors[idx], name };
    setFormData({ ...formData, floors });
  };

  // ---------- Room actions ----------
  const addRoom = (floorIdx) => {
    const floors = [...formData.floors];
    const roomNum = floors[floorIdx].rooms.length + 1;
    const floorNameClean =
      floors[floorIdx].name.replace(/\D/g, '') || floorIdx + 1;
    floors[floorIdx].rooms.push({
      id: null,
      name: `${floorNameClean}${String(roomNum).padStart(2, '0')}`,
      beds: [],
    });
    setFormData({ ...formData, floors });
  };

  const removeRoom = (floorIdx, roomIdx) => {
    if (!window.confirm('Remove this room and everything inside it?')) return;
    const floors = [...formData.floors];
    floors[floorIdx].rooms = floors[floorIdx].rooms.filter(
      (_, i) => i !== roomIdx
    );
    setFormData({ ...formData, floors });
  };

  const updateRoom = (floorIdx, roomIdx, name) => {
    const floors = [...formData.floors];
    floors[floorIdx].rooms[roomIdx].name = name;
    setFormData({ ...formData, floors });
  };

  // ---------- Bed actions ----------
  const addBed = (floorIdx, roomIdx) => {
    const floors = [...formData.floors];
    const bedNum = floors[floorIdx].rooms[roomIdx].beds.length + 1;
    floors[floorIdx].rooms[roomIdx].beds.push({
      id: null,
      name: `Bed ${bedNum}`,
      decks: [
        { id: null, position: 'Upper' },
        { id: null, position: 'Middle' },
        { id: null, position: 'Lower' },
      ],
    });
    setFormData({ ...formData, floors });
  };

  const removeBed = (floorIdx, roomIdx, bedIdx) => {
    if (!window.confirm('Remove this bed and its decks?')) return;
    const floors = [...formData.floors];
    floors[floorIdx].rooms[roomIdx].beds = floors[floorIdx].rooms[
      roomIdx
    ].beds.filter((_, i) => i !== bedIdx);
    setFormData({ ...formData, floors });
  };

  const updateBedDecks = (floorIdx, roomIdx, bedIdx, deckCount) => {
    const floors = [...formData.floors];
    const bed = floors[floorIdx].rooms[roomIdx].beds[bedIdx];
    const positions = ['Upper', 'Middle', 'Lower'].slice(0, Number(deckCount));
    const newDecks = positions.map((pos) => {
      const existing = bed.decks.find((d) => d.position === pos);
      return existing || { id: null, position: pos };
    });
    bed.decks = newDecks;
    setFormData({ ...formData, floors });
  };

  // ---------- SAVE ----------
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Building name is required');
      return;
    }

    const payload = {
      name: formData.name,
      address: formData.address,
      description: formData.description,
      floors: formData.floors.map((floor, floorIdx) => ({
        id: floor.id,
        name: floor.name,
        floor_number: floorIdx + 1,
        rooms: floor.rooms.map((room) => ({
          id: room.id,
          name: room.name,
          room_type: null,
          beds: room.beds.map((bed) => ({
            id: bed.id,
            name: bed.name,
            decks: bed.decks.map((deck) => ({
              id: deck.id,
              position: deck.position,
              monthly_rate: 0,
            })),
          })),
        })),
      })),
    };

    try {
      let result;
      if (isEditing) {
        result = await api.put(
          `/api/buildings/${building.id}/sync`,
          payload
        );
      } else {
        result = await api.post('/api/buildings', payload);
      }
      onSaved(result, isEditing);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content large"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            {isEditing ? 'Edit Building' : 'Add New Building'}
            <span className="step-indicator">
              Step {step} of 4 ·{' '}
              {step === 1
                ? 'Building'
                : step === 2
                ? 'Floors'
                : step === 3
                ? 'Rooms'
                : 'Beds & Decks'}
            </span>
          </h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {loadingTree ? (
          <p style={{ textAlign: 'center', padding: 40 }}>
            Loading structure...
          </p>
        ) : (
          <>
            {/* Step 1: Building */}
            {step === 1 && (
              <>
                <div className="form-group">
                  <label>Building Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Apollo Apartments"
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="e.g., E13 road, plot 25"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Optional notes about this building"
                    rows="3"
                  />
                </div>
              </>
            )}

            {/* Step 2: Floors */}
            {step === 2 && (
              <>
                <p className="step-description">
                  Floors in this building. Add, rename, or remove.
                </p>

                {formData.floors.length === 0 && (
                  <p
                    style={{
                      textAlign: 'center',
                      color: '#94a3b8',
                      padding: 20,
                    }}
                  >
                    No floors yet. Add your first floor below.
                  </p>
                )}

                {formData.floors.map((floor, idx) => (
                  <div key={idx} className="item-row">
                    <input
                      type="text"
                      value={floor.name}
                      onChange={(e) => updateFloor(idx, e.target.value)}
                      className="item-input"
                    />
                    <button
                      type="button"
                      className="item-remove-btn"
                      onClick={() => removeFloor(idx)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="add-item-btn"
                  onClick={addFloor}
                >
                  + Add Floor
                </button>
              </>
            )}

            {/* Step 3: Rooms */}
            {step === 3 && (
              <>
                <p className="step-description">
                  Rooms per floor. Add, rename, or remove.
                </p>

                {formData.floors.length === 0 && (
                  <p
                    style={{
                      textAlign: 'center',
                      color: '#94a3b8',
                      padding: 20,
                    }}
                  >
                    No floors yet. Go back to Step 2 and add some.
                  </p>
                )}

                {formData.floors.map((floor, floorIdx) => (
                  <div key={floorIdx} className="floor-group">
                    <h4 className="group-title">{floor.name}</h4>

                    {floor.rooms.length === 0 && (
                      <p
                        style={{
                          color: '#94a3b8',
                          fontSize: 13,
                          padding: 8,
                        }}
                      >
                        No rooms on this floor yet.
                      </p>
                    )}

                    {floor.rooms.map((room, roomIdx) => (
                      <div key={roomIdx} className="item-row">
                        <input
                          type="text"
                          value={room.name}
                          onChange={(e) =>
                            updateRoom(floorIdx, roomIdx, e.target.value)
                          }
                          className="item-input"
                        />
                        <button
                          type="button"
                          className="item-remove-btn"
                          onClick={() => removeRoom(floorIdx, roomIdx)}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="add-item-btn small"
                      onClick={() => addRoom(floorIdx)}
                    >
                      + Add Room
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* Step 4: Beds & Decks */}
            {step === 4 && (
              <>
                <p className="step-description">
                  Beds and deck levels per room.
                </p>

                {formData.floors.length === 0 && (
                  <p
                    style={{
                      textAlign: 'center',
                      color: '#94a3b8',
                      padding: 20,
                    }}
                  >
                    No floors yet. Go back to Step 2 and add some.
                  </p>
                )}

                {formData.floors.map((floor, floorIdx) => (
                  <div key={floorIdx} className="floor-group">
                    <h4 className="group-title">{floor.name}</h4>

                    {floor.rooms.map((room, roomIdx) => (
                      <div key={roomIdx} className="room-group">
                        <h5 className="room-title">Room {room.name}</h5>

                        {room.beds.length === 0 && (
                          <p
                            style={{
                              color: '#94a3b8',
                              fontSize: 13,
                              padding: 8,
                            }}
                          >
                            No beds yet.
                          </p>
                        )}

                        {room.beds.map((bed, bedIdx) => (
                          <div key={bedIdx} className="bed-edit-row">
                            <span className="bed-name">{bed.name}</span>
                            <select
                              className="deck-select"
                              value={bed.decks.length}
                              onChange={(e) =>
                                updateBedDecks(
                                  floorIdx,
                                  roomIdx,
                                  bedIdx,
                                  e.target.value
                                )
                              }
                            >
                              <option value="1">1 deck (Single)</option>
                              <option value="2">2 decks (Double)</option>
                              <option value="3">3 decks (Triple)</option>
                            </select>
                            <button
                              type="button"
                              className="item-remove-btn"
                              onClick={() =>
                                removeBed(floorIdx, roomIdx, bedIdx)
                              }
                            >
                              🗑️
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          className="add-item-btn small"
                          onClick={() => addBed(floorIdx, roomIdx)}
                        >
                          + Add Bed
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}

            {/* Footer: Cancel · Next · Save */}
            <div className="form-actions three-buttons">
              <button
                type="button"
                className="cancel-btn"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="next-btn"
                onClick={handleNext}
                disabled={step === 4}
              >
                Next
              </button>
              <button
                type="button"
                className="submit-btn"
                onClick={handleSave}
              >
                {isEditing ? 'Save Changes' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddEditBuildingWizard;