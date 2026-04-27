import React from 'react';
import { X } from 'lucide-react';
import './VehiclePopup.css';

export default function VehiclePopup({ vehicle, onNavigate, onClose }) {
  const loc = vehicle.location;
  const battery = vehicle.battery_level != null ? parseFloat(vehicle.battery_level) : null;

  const batteryColor =
    battery === null ? '#9ca3af' :
    battery > 60     ? '#14b88a' :
    battery > 30     ? '#f59e0b' : '#ef4444';

  const updatedStr = loc?.updated
    ? new Date(loc.updated).toLocaleString()
    : '—';

  return (
    <div className="veh-popup">
      <div className="veh-popup__header">
        <div className="veh-popup__title">
          <span className="veh-popup__dot" />
          <span className="veh-popup__vin">{vehicle.vin}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="veh-popup__badge">In Yard</span>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex', padding: '2px'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="veh-popup__rows">
        <div className="veh-popup__row">
          <span className="veh-popup__label">PCB</span>
          <span className="veh-popup__value mono">PCB{vehicle.current_pcb_id}</span>
        </div>
        <div className="veh-popup__row">
          <span className="veh-popup__label">Position</span>
          <span className="veh-popup__value mono">
            {loc ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}` : '—'}
          </span>
        </div>
        <div className="veh-popup__row">
          <span className="veh-popup__label">Updated</span>
          <span className="veh-popup__value">{updatedStr}</span>
        </div>
      </div>

      <div className="veh-popup__battery">
        <span className="veh-popup__label">Battery</span>
        <div className="veh-popup__battery-bar">
          <div
            className="veh-popup__battery-fill"
            style={{ width: `${battery ?? 0}%`, background: batteryColor }}
          />
        </div>
        <span className="veh-popup__battery-pct" style={{ color: batteryColor }}>
          {battery !== null ? `${battery}%` : '—'}
        </span>
      </div>

      <button className="veh-popup__navigate" onClick={onNavigate}>
        Navigate to this vehicle
      </button>
    </div>
  );
}