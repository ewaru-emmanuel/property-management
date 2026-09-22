import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useBuildings } from '../context/BuildingsContext';
import { useCurrency } from '../hooks/useCurrency';
import '../styles/payment.css';
import '../styles/occupant.css';

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Payments = () => {
  const { selectedBuilding } = useBuildings();
  const qc = useQueryClient();
  const { format: formatMoney, symbol } = useCurrency();

  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [formData, setFormData] = useState({
    occupant_id: '',
    amount_paid: '',
    balance: '',
    due_date: '',
    status: 'Paid',
    notes: '',
  });

  // ---------- Queries ----------
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

  // ---------- Create (optimistic) ----------
  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/api/payments', payload),

    onMutate: async (newPay) => {
      const key = ['payments', selectedBuilding.id];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData(key);

      const occ = occupants.find((o) => o.id === newPay.occupant_id);

      const optimistic = {
        id: 'temp-' + Date.now(),
        occupant_id: newPay.occupant_id,
        occupant_name: occ?.full_name || '—',
        room_name: occ?.room_name || '—',
        bed_name: occ?.bed_name || '—',
        deck_position: occ?.deck_position || '—',
        amount_paid: newPay.amount_paid,
        balance: newPay.balance,
        due_date: newPay.due_date,
        status: newPay.status,
        notes: newPay.notes,
        _optimistic: true,
      };

      qc.setQueryData(key, (old = []) => [optimistic, ...old]);
      return { previous };
    },

    onError: (_err, _newPay, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['payments', selectedBuilding.id], ctx.previous);
      }
      alert('Failed to add payment');
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['payments', selectedBuilding.id] });
      qc.invalidateQueries({ queryKey: ['stats', selectedBuilding.id] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/api/payments/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => alert('Failed to update: ' + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/payments/${id}`),

    onMutate: async (id) => {
      const key = ['payments', selectedBuilding.id];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData(key);
      qc.setQueryData(key, (old = []) => old.filter((p) => p.id !== id));
      return { previous };
    },

    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['payments', selectedBuilding.id], ctx.previous);
      }
      alert('Failed to delete payment');
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['payments', selectedBuilding.id] });
      qc.invalidateQueries({ queryKey: ['stats', selectedBuilding.id] });
    },
  });

  // ---------- Handlers ----------
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenAdd = () => {
    setEditingPayment(null);
    setFormData({
      occupant_id: '',
      amount_paid: '',
      balance: '',
      due_date: '',
      status: 'Paid',
      notes: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (payment) => {
    setEditingPayment(payment);
    setFormData({
      occupant_id: payment.occupant_id || '',
      amount_paid: payment.amount_paid ?? '',
      balance: payment.balance ?? '',
      due_date: payment.due_date || '',
      status: payment.status || 'Paid',
      notes: payment.notes || '',
    });
    setSelectedPayment(null);
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.occupant_id) {
      alert('Select an occupant');
      return;
    }

    if (editingPayment) {
      updateMutation.mutate(
        {
          id: editingPayment.id,
          payload: {
            amount_paid: Number(formData.amount_paid || 0),
            balance: Number(formData.balance || 0),
            due_date: formData.due_date || null,
            status: formData.status,
            notes: formData.notes,
          },
        },
        {
          onSuccess: () => {
            setShowModal(false);
            setEditingPayment(null);
          },
        }
      );
    } else {
      setShowModal(false);
      setFormData({
        occupant_id: '',
        amount_paid: '',
        balance: '',
        due_date: '',
        status: 'Paid',
        notes: '',
      });

      createMutation.mutate({
        occupant_id: formData.occupant_id,
        amount_paid: Number(formData.amount_paid || 0),
        balance: Number(formData.balance || 0),
        due_date: formData.due_date || null,
        status: formData.status,
        notes: formData.notes,
      });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this payment?')) {
      deleteMutation.mutate(id);
      setSelectedPayment(null);
    }
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
        <button
          className="add-occupant-btn"
          onClick={handleOpenAdd}
          disabled={createMutation.isPending}
          style={
            createMutation.isPending
              ? { opacity: 0.6, cursor: 'not-allowed' }
              : undefined
          }
        >
          {createMutation.isPending ? 'Saving...' : '+ Record Payment'}
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
        <div className="results-count">
          {filtered.length} of {payments.length}
        </div>
      </div>

      <div className="payments-summary">
        <div className="summary-card paid">
          <h3>✅ Total Paid</h3>
          <p>{formatMoney(totalPaid)}</p>
        </div>
        <div className="summary-card pending">
          <h3>⏳ Pending Balance</h3>
          <p>{formatMoney(totalPending)}</p>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="payment-row"
                    style={p._optimistic ? { opacity: 0.6 } : undefined}
                    onClick={() => setSelectedPayment(p)}
                  >
                    <td data-label="Occupant" className="cell-name">
                      <div className="occupant-avatar">
                        {getInitials(p.occupant_name)}
                      </div>
                      <span className="occupant-name-text">
                        {p.occupant_name || '—'}
                      </span>
                    </td>
                    <td data-label="Room">{p.room_name || '—'}</td>
                    <td data-label="Bed">{p.bed_name || '—'}</td>
                    <td data-label="Deck">{p.deck_position || '—'}</td>
                    <td data-label="Amount Paid">{formatMoney(p.amount_paid)}</td>
                    <td data-label="Balance">{formatMoney(p.balance)}</td>
                    <td data-label="Due Date">{p.due_date || '—'}</td>
                    <td data-label="Status">
                      <span className={`status-badge ${p.status?.toLowerCase()}`}>
                        {p.status}
                      </span>
                    </td>
                    <td data-label="Actions">
                      <button
                        className="action-btn edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(p);
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p.id);
                        }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="no-results">
                    No payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Bottom Sheet ---------- */}
      {selectedPayment && (
        <div
          className="occupant-sheet-overlay"
          onClick={() => setSelectedPayment(null)}
        >
          <div className="occupant-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />

            <div className="sheet-header">
              <div className="occupant-avatar large">
                {getInitials(selectedPayment.occupant_name)}
              </div>
              <h3>{selectedPayment.occupant_name}</h3>
              <span
                className={`status-badge ${selectedPayment.status?.toLowerCase()}`}
              >
                {selectedPayment.status}
              </span>
            </div>

            <div className="sheet-details">
              <div className="sheet-row">
                <span className="sheet-label">🚪 Room</span>
                <span>{selectedPayment.room_name || '—'}</span>
              </div>
              <div className="sheet-row">
                <span className="sheet-label">🛏️ Bed / Deck</span>
                <span>
                  {selectedPayment.bed_name || '—'}
                  {selectedPayment.deck_position
                    ? ` · ${selectedPayment.deck_position}`
                    : ''}
                </span>
              </div>
              <div className="sheet-row">
                <span className="sheet-label">💰 Amount Paid</span>
                <span>{formatMoney(selectedPayment.amount_paid)}</span>
              </div>
              <div className="sheet-row">
                <span className="sheet-label">⚖️ Balance</span>
                <span>{formatMoney(selectedPayment.balance)}</span>
              </div>
              <div className="sheet-row">
                <span className="sheet-label">📅 Due Date</span>
                <span>{selectedPayment.due_date || '—'}</span>
              </div>
              <div className="sheet-row">
                <span className="sheet-label">📝 Notes</span>
                <span>{selectedPayment.notes || '—'}</span>
              </div>
            </div>

            <div className="sheet-actions">
              <button
                className="sheet-edit-btn"
                onClick={() => handleOpenEdit(selectedPayment)}
              >
                ✏️ Edit Payment
              </button>
              <button
                className="sheet-delete-btn"
                onClick={() => handleDelete(selectedPayment.id)}
              >
                🗑️ Delete Payment
              </button>
              <button
                className="sheet-cancel-btn"
                onClick={() => setSelectedPayment(null)}
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
              <h3>{editingPayment ? 'Edit Payment' : '➕ Record Payment'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Occupant *</label>
                <select
                  name="occupant_id"
                  value={formData.occupant_id}
                  onChange={handleInputChange}
                  required
                  disabled={!!editingPayment}
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
                  <label>Amount Paid ({symbol})</label>
                  <input
                    type="number"
                    name="amount_paid"
                    step="0.01"
                    value={formData.amount_paid}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Balance ({symbol})</label>
                  <input
                    type="number"
                    name="balance"
                    step="0.01"
                    value={formData.balance}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes}
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
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingPayment
                    ? 'Save Changes'
                    : '✅ Save Payment'}
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