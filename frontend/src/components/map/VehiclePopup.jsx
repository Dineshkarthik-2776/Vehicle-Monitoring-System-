import React from 'react';
import { X, Navigation } from 'lucide-react';
import './VehiclePopup.css';

export default function VehiclePopup({ vehicle, onNavigate, onClose }) {
  const loc     = vehicle.location;
  const battery = vehicle.battery_level != null ? parseFloat(vehicle.battery_level) : null;

  const batteryColor =
    battery === null ? '#9ca3af' :
    battery > 60     ? '#14b88a' :
    battery > 30     ? '#f59e0b' : '#ef4444';

  const batteryLabel =
    battery === null   ? 'Unknown'  :
    battery > 60       ? 'Good'     :
    battery > 30       ? 'Moderate' : 'Critical';

  const updatedStr = loc?.updated
    ? new Date(loc.updated).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : '—';

  const assignedStr = vehicle.assigned_at
    ? new Date(vehicle.assigned_at).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      })
    : '—';

  return (
    <div className="veh-popup">
      {/* Header */}
      <div className="veh-popup__header">
        <div className="veh-popup__title">
          <span className="veh-popup__dot" />
          <span className="veh-popup__vin">{vehicle.vin}</span>
        </div>
        <div className="veh-popup__header-right">
          <span className="veh-popup__badge">Live GPS</span>
          {onClose && (
            <button className="veh-popup__close" onClick={onClose} aria-label="Close">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Info rows */}
      <div className="veh-popup__rows">
        <div className="veh-popup__row">
          <span className="veh-popup__label">PCB ID</span>
          <span className="veh-popup__value mono">PCB{vehicle.current_pcb_id}</span>
        </div>
        <div className="veh-popup__row">
          <span className="veh-popup__label">Latitude</span>
          <span className="veh-popup__value mono">
            {loc ? loc.lat.toFixed(6) : '—'}
          </span>
        </div>
        <div className="veh-popup__row">
          <span className="veh-popup__label">Longitude</span>
          <span className="veh-popup__value mono">
            {loc ? loc.lng.toFixed(6) : '—'}
          </span>
        </div>
        <div className="veh-popup__row">
          <span className="veh-popup__label">Last Signal</span>
          <span className="veh-popup__value">{updatedStr}</span>
        </div>
        <div className="veh-popup__row">
          <span className="veh-popup__label">Assigned</span>
          <span className="veh-popup__value">{assignedStr}</span>
        </div>
      </div>

      {/* Battery */}
      <div className="veh-popup__battery-section">
        <div className="veh-popup__battery-header">
          <span className="veh-popup__label">Battery</span>
          <span className="veh-popup__battery-label" style={{ color: batteryColor }}>
            {batteryLabel}
          </span>
        </div>
        <div className="veh-popup__battery-wrap">
          <div className="veh-popup__battery-bar">
            <div
              className="veh-popup__battery-fill"
              style={{
                width: `${Math.min(100, Math.max(0, battery ?? 0))}%`,
                background: batteryColor
              }}
            />
          </div>
          <span className="veh-popup__battery-pct" style={{ color: batteryColor }}>
            {battery !== null ? `${battery.toFixed(0)}%` : '—'}
          </span>
        </div>
      </div>

      {/* Navigate button */}
      <button className="veh-popup__navigate" onClick={onNavigate}>
        <Navigation size={14} />
        Navigate to Vehicle
      </button>
    </div>
  );
}