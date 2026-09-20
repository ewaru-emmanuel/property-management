import React, { useState } from 'react';
import '../styles/buildings.css';

const Buildings = ({ onSelectBuilding }) => {
  const [buildings, setBuildings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
  });

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Open modal for new building
  const handleAddNew = () => {
    setEditingBuilding(null);
    setFormData({ name: '', address: '', description: '' });
    setShowModal(true);
  };

  // Open modal for editing
  const handleEdit = (building) => {
    setEditingBuilding(building);
    setFormData({
      name: building.name,
      address: building.address,
      description: building.description,
    });
    setShowModal(true);
  };

  // Submit form
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter a building name');
      return;
    }

    if (editingBuilding) {
      // Update existing
      setBuildings(buildings.map(b =>
        b.id === editingBuilding.id
          ? { ...b, ...formData }
          : b
      ));
    } else {
      // Add new
      const newBuilding = {
        id: Date.now(),
        ...formData,
        floors: 0,
        rooms: 0,
        beds: 0,
        createdAt: new Date().toLocaleDateString(),
      };
      setBuildings([...buildings, newBuilding]);
    }

    setShowModal(false);
    setFormData({ name: '', address: '', description: '' });
  };

  // Delete building
  const handleDelete = (id) => {
    if (window.confirm('Delete this building? All floors, rooms, and beds inside will also be removed.')) {
      setBuildings(buildings.filter(b => b.id !== id));
    }
  };

  return (
    <div className="buildings-page">
      <div className="buildings-header">
        <div>
          <h2>My Buildings</h2>
          <p className="welcome">Manage all your buildings in one place.</p>
        </div>
        <button className="add-building-btn" onClick={handleAddNew}>
          Add Building
        </button>
      </div>

      {/* Empty State */}
      {buildings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏢</div>
          <h3>No buildings yet</h3>
          <p>Click "Add Building" to create your first building.</p>
          <button className="add-building-btn" onClick={handleAddNew}>
            + Add Your First Building
          </button>
        </div>
      ) : (
        <div className="buildings-grid">
          {buildings.map((building) => (
            <div key={building.id} className="building-card">
              <div className="building-card-header">
                <h3>{building.name}</h3>
                <div className="building-actions">
                  <button
                    className="action-btn edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(building);
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(building.id);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <p className="building-address">📍 {building.address || 'No address'}</p>
              {building.description && (
                <p className="building-description">{building.description}</p>
              )}

              <div className="building-stats">
                <span>{building.floors} Floors</span>
                <span>{building.rooms} Rooms</span>
                <span>{building.beds} Beds</span>
              </div>

              <button
                className="view-building-btn"
                onClick={() => onSelectBuilding && onSelectBuilding(building)}
              >
                View Floors →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingBuilding ? '✏️ Edit Building' : '➕ Add New Building'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Building Name *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g., Sunrise Hostel"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  placeholder="e.g., Kampala Road, Plot 25"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  placeholder="Optional notes about this building"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
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
                  {editingBuilding ? ' Save Changes' : ' Create Building'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Buildings;