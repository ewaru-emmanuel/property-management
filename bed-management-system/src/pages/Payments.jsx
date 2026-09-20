import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useBuildings } from '../context/BuildingsContext';
import '../styles/payment.css';

const Payments = () => {
  const { selectedBuilding } = useBuildings();
  const qc = useQueryClient();

  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    occupant_id: '',
    amount_paid: '',
    balance: '',
    due_date: '',
    status: 'Paid',
    notes: '',
  });

  const { data: payments = [], isLoading, error } = useQuery({
    queryKey: ['payments', selectedBuilding?.id],
    queryFn: () => api.get(`/api/payments?building_id=${selectedBuilding.id}`),
    enabled: !!selectedBuilding,
  });

  const { data: occupants = [] } = useQuery({
    queryKey: ['occupants', selectedBuilding?.id],
    queryFn: () => api.get(`/api/occupants?building_id=${selectedBuilding.id}`),
    enabled: !!selectedBuilding,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/api/payments', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.occupant_id) {
      alert('Select an occupant');
      return;
    }
    createMutation.mutate(
      {
        occupant_id: formData.occupant_id,
        amount_paid: Number(formData.amount_paid || 0),
        balance: Number(formData.balance || 0),
        due_date: formData.due_date || null,
        status: formData.status,
        notes: formData.notes,
      },
      {
        onSuccess: () => {
          setShowModal(false);
          setFormData({
            occupant_id: '',
            amount_paid: '',
            balance: '',
            due_date: '',
            status: 'Paid',
            notes: '',
          });
        },
        onError: (err) => alert('Failed: ' + err.message),
      }
    );
  };

  const filtered = payments.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      p.occupant_name?.toLowerCase().includes(term) ||
      p.room_name?.toLowerCase().includes(term);
    const matchStatus = filterStatus === 'All' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPaid = filtered
    .filter((p) => p.status === 'Paid')
    .reduce((s, p) => s + Number(p.amount_paid || 0), 0);

  const totalPending = filtered
    .filter((p) => p.status === 'Pending')
    .reduce((s, p) => s + Number(p.balance || 0), 0);

  if (!selectedBuilding) {
    return (
      <div className="payments-page">
        <h2>Payments</h2>
        <p className="welcome">Select a building from the header.</p>
      </div>
    );
  }

  return (
    <div className="payments-page">
      <div className="occupants-header">
        <div>
          <h2>{selectedBuilding.name} — Payments</h2>
          <p className="welcome">Track payments from all occupants.</p>
        </div>
        <button className="add-occupant-btn" onClick={() => setShowModal(true)}>
          + Record Payment
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
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
          </select>
        </div>
        <div className="results-count">{filtered.length} of {payments.length}</div>
      </div>

      <div className="payments-summary">
        <div className="summary-card paid">
          <h3>✅ Total Paid</h3>
          <p>${totalPaid.toFixed(2)}</p>
        </div>
        <div className="summary-card pending">
          <h3>⏳ Pending Balance</h3>
          <p>${totalPending.toFixed(2)}</p>
        </div>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>Error: {error.message}</p>
      ) : (
        <div className="payments-table-wrapper">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Occupant</th>
                <th>Room</th>
                <th>Bed</th>
                <th>Deck</th>
                <th>Amount Paid</th>
                <th>Balance</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.occupant_name}</td>
                    <td>{p.room_name || '—'}</td>
                    <td>{p.bed_name || '—'}</td>
                    <td>{p.deck_position || '—'}</td>
                    <td>${Number(p.amount_paid || 0).toFixed(2)}</td>
                    <td>${Number(p.balance || 0).toFixed(2)}</td>
                    <td>{p.due_date || '—'}</td>
                    <td>
                      <span className={`status-badge ${p.status?.toLowerCase()}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" className="no-results">No payments recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Record Payment</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Occupant *</label>
                <select
                  name="occupant_id"
                  value={formData.occupant_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">-- Select occupant --</option>
                  {occupants.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.full_name} ({o.room_name || '—'} / {o.bed_name || '—'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount Paid ($)</label>
                  <input type="number" name="amount_paid" step="0.01"
                    value={formData.amount_paid} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Balance ($)</label>
                  <input type="number" name="balance" step="0.01"
                    value={formData.balance} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" name="due_date"
                    value={formData.due_date} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input type="text" name="notes" value={formData.notes} onChange={handleInputChange} />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : '✅ Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;