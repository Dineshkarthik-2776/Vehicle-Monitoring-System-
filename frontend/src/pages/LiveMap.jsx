import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp, YARD_CENTER } from '../context/AppContext';
import VehiclePopup from '../components/map/VehiclePopup';
import './LiveMap.css';

// Fix Leaflet default marker icon (required when using webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_ZOOM = 16;

// ── Small green circle marker icon ──────────────────────────────────────────
function makeCircleIcon(pulsing = false, color = '#14b88a') {
  const pulse = pulsing
    ? `<circle cx="10" cy="10" r="9" fill="${color}" fill-opacity="0.2">
         <animate attributeName="r" from="7" to="13" dur="1.2s" repeatCount="indefinite"/>
         <animate attributeName="fill-opacity" from="0.3" to="0" dur="1.2s" repeatCount="indefinite"/>
       </circle>`
    : '';
  const svg = `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    ${pulse}
    <circle cx="10" cy="10" r="7" fill="${color}" stroke="white" stroke-width="2.5"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [20, 20],
    iconAnchor: [10, 10],     // centre of circle sits on the coordinate
    popupAnchor:[0, -12],     // popup opens 12px above the circle centre
  });
}

// ── User location marker icon ────────────────────────────────────────────────
function makeUserIcon() {
  const svg = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#3b82f6" fill-opacity="0.3"/>
    <circle cx="12" cy="12" r="6" fill="#2563eb" stroke="white" stroke-width="2"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [24, 24],
    iconAnchor: [12, 12],
  });
}

// ── Map controller — fly to vehicle or refocus to yard ───────────────────────
function MapController({ flyTarget, refocusTick }) {
  const map = useMap();
  const prevRefocusTick = useRef(refocusTick);

  useEffect(() => {
    if (flyTarget) {
      map.flyTo([flyTarget.lat, flyTarget.lng], 18, { duration: 1.2 });
    }
  }, [flyTarget, map]);

  useEffect(() => {
    if (refocusTick !== prevRefocusTick.current) {
      prevRefocusTick.current = refocusTick;
      map.closePopup();
      map.flyTo([YARD_CENTER.lat, YARD_CENTER.lng], DEFAULT_ZOOM, { duration: 1.0 });
    }
  }, [refocusTick, map]);

  return null;
}

// ── Programmatic open-popup helper ──────────────────────────────────────────
// When selectVin changes, opens the matching Leaflet Popup.
function AutoOpenPopup({ selectVin, markerRefs }) {
  const map = useMap();
  useEffect(() => {
    if (!selectVin) return;
    
    let attempts = 0;
    const tryOpen = () => {
      const marker = markerRefs.current[selectVin];
      // Ensure the marker exists AND React-Leaflet has successfully bound the <Popup> child
      if (marker && marker.getPopup()) {
        marker.openPopup();
      } else if (attempts < 20) {
        attempts++;
        setTimeout(tryOpen, 100);
      }
    };
    
    tryOpen();
  }, [selectVin, map, markerRefs]);
  return null;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function LiveMap() {
  const { inYardVehicles, mapRefocusTick, selectVin, setSelectVin, userLocation, routePath, routeTarget, setRouteTarget } = useApp();
  const [flyTarget,     setFlyTarget]     = useState(null);
  const [recentUpdates, setRecentUpdates] = useState({});
  const timerRef    = useRef({});
  const markerRefs  = useRef({});  // vin → Leaflet marker instance

  // Pulse for 3 s after a live WebSocket update
  useEffect(() => {
    inYardVehicles.forEach(v => {
      const loc = v.location;
      if (!loc) return;
      const key = `${v.current_pcb_id}-${loc.updated}`;
      if (timerRef.current[v.current_pcb_id] === key) return;
      timerRef.current[v.current_pcb_id] = key;
      setRecentUpdates(prev => ({ ...prev, [v.current_pcb_id]: true }));
      setTimeout(() => {
        setRecentUpdates(prev => {
          const next = { ...prev };
          delete next[v.current_pcb_id];
          return next;
        });
      }, 3000);
    });
  }, [inYardVehicles]);

  // Fly to vehicle + open popup when sidebar search selects one
  useEffect(() => {
    if (!selectVin) return;
    const v = inYardVehicles.find(v => v.vin === selectVin);
    if (v?.location) {
      setFlyTarget({ lat: v.location.lat, lng: v.location.lng });
    }
    // Reset after handling so re-selecting same VIN works again
    const t = setTimeout(() => setSelectVin(null), 800);
    return () => clearTimeout(t);
  }, [selectVin, inYardVehicles, setSelectVin]);

  const handleNavigate = useCallback((v) => {
    if (v.location) {
      setRouteTarget({ lat: v.location.lat, lng: v.location.lng });
      setFlyTarget({ lat: v.location.lat, lng: v.location.lng });
    }
  }, [setRouteTarget]);

  return (
    <div className="livemap">
      <MapContainer
        center={[YARD_CENTER.lat, YARD_CENTER.lng]}
        zoom={DEFAULT_ZOOM}
        className="livemap__map"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        <MapController flyTarget={flyTarget} refocusTick={mapRefocusTick} />
        <AutoOpenPopup selectVin={selectVin} markerRefs={markerRefs} />

        {/* Navigation Route and User Location */}
        {routePath.length > 0 && (
          <Polyline positions={routePath} color="#2563eb" weight={5} opacity={0.8} />
        )}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={makeUserIcon()}>
            <Tooltip direction="top" offset={[0, -10]}>You are here</Tooltip>
          </Marker>
        )}

        {inYardVehicles.map(v => {
          if (!v.location || v.location.lat == null || v.location.lng == null) return null;
          const isPulsing = !!recentUpdates[v.current_pcb_id];
          const color = v.stageTier === 2 ? '#78350f' : v.stageTier === 1 ? '#f59e0b' : '#14b88a';
          return (
            <Marker
              key={v.vin}
              position={[v.location.lat, v.location.lng]}
              icon={makeCircleIcon(isPulsing, color)}
              ref={el => { if (el) markerRefs.current[v.vin] = el; }}
            >
              {/* Popup anchored directly above the marker via popupAnchor in icon */}
              <Popup
                className="vehicle-popup-leaflet"
                closeButton={false}
                minWidth={272}
                maxWidth={272}
              >
                <VehiclePopup
                  vehicle={v}
                  onNavigate={() => handleNavigate(v)}
                  onClose={null} /* Leaflet handles close via clicking away */
                />
              </Popup>
              <Tooltip direction="top" offset={[0, -12]} opacity={1}>
                <strong>{v.vin}</strong>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Custom zoom controls */}
      <div className="livemap__zoom">
        <button aria-label="Zoom in"  onClick={() => document.querySelector('.leaflet-control-zoom-in')?.click()}>+</button>
        <button aria-label="Zoom out" onClick={() => document.querySelector('.leaflet-control-zoom-out')?.click()}>−</button>
      </div>

      {/* Navigation Overlay */}
      {routeTarget && (
        <div className="livemap__nav-overlay" style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-primary)', padding: '12px 20px', borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 1000, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Navigating to vehicle...</span>
          </div>
          <button onClick={() => setRouteTarget(null)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '20px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {/* GPS count badge */}
      <div className="livemap__stats">
        <div className="livemap__stats-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div>
          <div className="livemap__stats-count">{inYardVehicles.length}</div>
          <div className="livemap__stats-label">Vehicles with GPS</div>
        </div>
      </div>
    </div>
  );
}