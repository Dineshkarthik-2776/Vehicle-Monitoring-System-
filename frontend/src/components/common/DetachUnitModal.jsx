import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { vehicleApi } from '../../services/api';
import { useApp } from '../../context/AppContext';
import './AssignUnitModal.css';

export default function DetachUnitModal({ onClose }) {
  const { vehicles, refresh } = useApp();
  const [pcbId, setPcbId] = useState('');
  const [verifiedVin, setVerifiedVin] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleVerify() {
    setError('');
    const upperPcbId = pcbId.toUpperCase().trim();
    if (!upperPcbId.startsWith('PCB')) {
      setError('PCB ID must start with "PCB" (e.g. PCB101).');
      return;
    }
    const idStr = pcbId.replace(/\D/g, '');
    const idNum = Number(idStr);
    if (!idNum) {
      setError('Please enter a valid PCB ID (e.g. PCB101).');
      return;
    }
    const vehicle = vehicles.find(v => v.current_pcb_id === idNum);
    if (vehicle) {
      setVerifiedVin(vehicle.vin);
    } else {
      setError('This PCB is not currently assigned to any vehicle.');
      setVerifiedVin(null);
    }
  }

  async function handleDetach() {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const idNum = Number(pcbId.replace(/\D/g, ''));
      await vehicleApi.detach(idNum, verifiedVin);
      setSuccess(true);
      refresh();
      setTimeout(onClose, 1200);
    } catch (e) {
      setError(e.response?.data?.Error || e.message || 'Failed to detach unit');
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <div className="modal__title">Detach Unit</div>
            <div className="modal__sub">Unmap a PCB from its Vehicle</div>
          </div>
          <button className="modal__close" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="modal__body">
          <div className="modal__field">
            <label className="modal__label">PCB ID</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="modal__input"
                placeholder="e.g. PCB101"
                value={pcbId}
                onChange={e => {
                  setPcbId(e.target.value);
                  setVerifiedVin(null);
                  setShowConfirm(false);
                }}
                disabled={loading || success || verifiedVin}
              />
              {!verifiedVin && (
                <button className="modal__btn modal__btn--submit" style={{ padding: '0 16px', width: 'auto' }} onClick={handleVerify}>Verify</button>
              )}
            </div>
          </div>

          {verifiedVin && (
            <div className="modal__field">
              <label className="modal__label">Mapped Vehicle VIN</label>
              <input
                className="modal__input"
                value={verifiedVin}
                disabled
                style={{ background: 'var(--gray-50)', color: 'var(--text-secondary)' }}
              />
            </div>
          )}

          {showConfirm && !success && (
            <div className="modal__error" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
              <AlertCircle size={14}/>
              <span>Are you sure you want to detach {pcbId.toUpperCase().startsWith('PCB') ? pcbId : `PCB${pcbId}`} from VIN {verifiedVin}? This will mark the PCB as available.</span>
            </div>
          )}

          {error && (
            <div className="modal__error">
              <AlertCircle size={14}/>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="modal__success">
              <Check size={14}/>
              <span>Unit detached successfully!</span>
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button className="modal__btn modal__btn--cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          {verifiedVin && (
            <button 
              className="modal__btn modal__btn--submit" 
              onClick={handleDetach} 
              disabled={loading || success}
              style={showConfirm ? { background: '#ef4444' } : {}}
            >
              {loading ? 'Detaching…' : showConfirm ? 'Yes, Detach Unit' : 'Detach Unit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
