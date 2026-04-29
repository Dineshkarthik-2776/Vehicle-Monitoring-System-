import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { vehicleApi } from '../../services/api';
import { useApp } from '../../context/AppContext';
import './AssignUnitModal.css';

export default function SwapUnitModal({ onClose }) {
  const { vehicles, pcbs, refresh } = useApp();
  const [oldPcbId, setOldPcbId] = useState('');
  const [newPcbId, setNewPcbId] = useState('');
  const [verifiedVin, setVerifiedVin] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const availablePcbs = pcbs.filter(p => p.status === 'AVAILABLE');

  function handleVerify() {
    setError('');
    const upperPcbId = oldPcbId.toUpperCase().trim();
    if (!upperPcbId.startsWith('PCB')) {
      setError('PCB ID must start with "PCB" (e.g. PCB101).');
      return;
    }
    const idStr = oldPcbId.replace(/\D/g, '');
    const idNum = Number(idStr);
    if (!idNum) {
      setError('Please enter a valid old PCB ID (e.g. PCB101).');
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

  async function handleSwap() {
    if (!newPcbId) {
      setError('Please select a new PCB to swap to.');
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const oldIdNum = Number(oldPcbId.replace(/\D/g, ''));
      await vehicleApi.swap(oldIdNum, Number(newPcbId), verifiedVin);
      setSuccess(true);
      refresh();
      setTimeout(onClose, 1200);
    } catch (e) {
      setError(e.response?.data?.Error || e.message || 'Failed to swap unit');
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
            <div className="modal__title">Swap Unit</div>
            <div className="modal__sub">Replace an active PCB with a new one</div>
          </div>
          <button className="modal__close" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="modal__body">
          <div className="modal__field">
            <label className="modal__label">Old PCB ID</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="modal__input"
                placeholder="e.g. PCB101"
                value={oldPcbId}
                onChange={e => {
                  setOldPcbId(e.target.value);
                  setVerifiedVin(null);
                  setNewPcbId('');
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
            <>
              <div className="modal__field">
                <label className="modal__label">Mapped Vehicle VIN</label>
                <input
                  className="modal__input"
                  value={verifiedVin}
                  disabled
                  style={{ background: 'var(--gray-50)', color: 'var(--text-secondary)' }}
                />
              </div>

              <div className="modal__field">
                <label className="modal__label">Select New PCB</label>
                <select
                  className="modal__input modal__select"
                  value={newPcbId}
                  onChange={e => {
                    setNewPcbId(e.target.value);
                    setShowConfirm(false);
                  }}
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
            </>
          )}

          {showConfirm && !success && (
            <div className="modal__error" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
              <AlertCircle size={14}/>
              <span>Are you sure you want to swap {oldPcbId.toUpperCase().startsWith('PCB') ? oldPcbId : `PCB${oldPcbId}`} with PCB{newPcbId} for VIN {verifiedVin}? The old PCB will be marked as available.</span>
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
              <span>Unit swapped successfully!</span>
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
              onClick={handleSwap} 
              disabled={loading || success}
              style={showConfirm ? { background: '#f59e0b' } : {}}
            >
              {loading ? 'Swapping…' : showConfirm ? 'Yes, Swap Unit' : 'Swap Unit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
