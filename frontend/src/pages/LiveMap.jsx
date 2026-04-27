import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../context/AppContext';
import VehiclePopup from '../components/map/VehiclePopup';
import './LiveMap.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom truck icon — highlight if recently updated
function makeTruckIcon(color = '#14b88a', pulsing = false) {
  const svg = `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    ${pulsing ? `<circle cx="18" cy="18" r="17" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="2">
      <animate attributeName="r" from="14" to="19" dur="1.2s" repeatCount="indefinite" />
      <animate attributeName="fill-opacity" from="0.3" to="0" dur="1.2s" repeatCount="indefinite" />
    </circle>` : `<circle cx="18" cy="18" r="17" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="1.5"/>`}
    <rect x="10" y="14" width="16" height="10" rx="2" fill="${color}"/>
    <rect x="10" y="14" width="10" height="10" rx="2" fill="${color}" opacity="0.7"/>
    <circle cx="13" cy="25" r="2" fill="white"/>
    <circle cx="23" cy="25" r="2" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

// Fly-to helper
function FlyTo({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 16, { duration: 1.2 });
  }, [coords, map]);
  return null;
}

const DEFAULT_CENTER = [13.0827, 80.2707]; // Chennai

export default function LiveMap() {
  const { inYardVehicles } = useApp();
  const [selected, setSelected] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  // Track recently-updated PCBs for pulse animation (pcb_id → timeout)
  const [recentUpdates, setRecentUpdates] = useState({});
  const timerRef = useRef({});

  // Watch for location changes and pulse the marker for 3 seconds
  useEffect(() => {
    inYardVehicles.forEach(v => {
      const loc = v.location;
      if (!loc) return;
      const key = `${v.current_pcb_id}-${loc.updated}`;
      if (timerRef.current[v.current_pcb_id] === key) return; // already seen

      timerRef.current[v.current_pcb_id] = key;
      setRecentUpdates(prev => ({ ...prev, [v.current_pcb_id]: true }));
      setTimeout(() => {
        setRecentUpdates(prev => { const n = { ...prev }; delete n[v.current_pcb_id]; return n; });
      }, 3000);
    });
  }, [inYardVehicles]);

  // Keep selected vehicle data in sync with live updates
  useEffect(() => {
    if (!selected) return;
    const updated = inYardVehicles.find(v => v.vin === selected.vin);
    if (updated) setSelected(updated);
  }, [inYardVehicles]);

  function handleMarkerClick(v) {
    setSelected(v);
  }

  function handleNavigate(v) {
    if (v.location) setFlyTarget([v.location.lat, v.location.lng]);
  }

  return (
    <div className="livemap">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={13}
        className="livemap__map"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {inYardVehicles.map(v => (
          <React.Fragment key={v.vin}>
            <Circle
              center={[v.location.lat, v.location.lng]}
              radius={300}
              pathOptions={{
                color: '#14b88a',
                fillColor: '#14b88a',
                fillOpacity: 0.06,
                weight: 1.5,
                dashArray: '6 4',
              }}
            />
            <Marker
              position={[v.location.lat, v.location.lng]}
              icon={makeTruckIcon('#14b88a', !!recentUpdates[v.current_pcb_id])}
              eventHandlers={{ click: () => handleMarkerClick(v) }}
            />
          </React.Fragment>
        ))}

        {flyTarget && <FlyTo coords={flyTarget} />}
      </MapContainer>

      {/* Zoom controls */}
      <div className="livemap__zoom">
        <button onClick={() => document.querySelector('.leaflet-control-zoom-in')?.click()}>+</button>
        <button onClick={() => document.querySelector('.leaflet-control-zoom-out')?.click()}>−</button>
      </div>

      {/* Popup card */}
      {selected && selected.location && (
        <div className="livemap__popup-wrap">
          <VehiclePopup
            vehicle={selected}
            onNavigate={() => { handleNavigate(selected); setSelected(null); }}
            onClose={() => setSelected(null)}
          />
        </div>
      )}

      {/* Bottom-left stats badge */}
      <div className="livemap__stats">
        <div className="livemap__stats-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div>
          <div className="livemap__stats-count">{inYardVehicles.length}</div>
          <div className="livemap__stats-label">Vehicles in yard</div>
        </div>
      </div>
    </div>
  );
}