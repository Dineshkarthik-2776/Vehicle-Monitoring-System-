import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { vehicleApi } from '../../services/api';
import { useApp } from '../../context/AppContext';
import './AssignUnitModal.css';

export default function AssignUnitModal({ onClose }) {
  const { pcbs, refresh } = useApp();
  const [vin, setVin] = useState('');
  const [pcbId, setPcbId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const availablePcbs = pcbs.filter(p => p.status === 'AVAILABLE');

  async function handleSubmit() {
    if (!vin.trim() || !pcbId) {
      setError('Both VIN and PCB are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await vehicleApi.attach(Number(pcbId), vin.trim());
      setSuccess(true);
      refresh();
      setTimeout(onClose, 1200);
    } catch (e) {
      setError(e.response?.data?.Error || e.message || 'Failed to assign unit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <div className="modal__title">Assign Unit</div>
            <div className="modal__sub">Map a PCB to a Vehicle VIN</div>
          </div>
          <button className="modal__close" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="modal__body">
          <div className="modal__field">
            <label className="modal__label">Vehicle VIN</label>
            <input
              className="modal__input"
              placeholder="e.g. AL101"
              value={vin}
              onChange={e => setVin(e.target.value)}
              disabled={loading || success}
            />
          </div>

          <div className="modal__field">
            <label className="modal__label">Select PCB</label>
            <select
              className="modal__input modal__select"
              value={pcbId}
              onChange={e => setPcbId(e.target.value)}
              disabled={loading || success}
            >
              <option value="">— Choose available PCB —</option>
              {availablePcbs.map(p => (
                <option key={p.pcb_id} value={p.pcb_id}>
                  PCB{p.pcb_id} {p.battery_level != null ? `· ${p.battery_level}%` : ''}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="modal__error">
              <AlertCircle size={14}/>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="modal__success">
              <Check size={14}/>
              <span>Unit assigned successfully!</span>
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button className="modal__btn modal__btn--cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="modal__btn modal__btn--submit" onClick={handleSubmit} disabled={loading || success}>
            {loading ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}
