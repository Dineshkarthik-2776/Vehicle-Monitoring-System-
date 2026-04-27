import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { vehicleApi, pcbApi, analyticsApi } from '../services/api';

const AppContext = createContext(null);

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';

// ── Yard configuration ─────────────────────────────────────────────────────
export const YARD_CENTER = {
  lat: 13.209114773647052,
  lng: 80.31939877710973,
};
// ──────────────────────────────────────────────────────────────────────────

const MAX_VEHICLES = 500;
const MAX_PCBS = 500;

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('al-theme') || 'light');
  const [vehicles, setVehicles] = useState([]);
  const [pcbs, setPcbs] = useState([]);
  const [pcbLocations, setPcbLocations] = useState({});
  const [todayStats, setTodayStats] = useState({ entries: 0, exits: 0 });
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapRefocusTick, setMapRefocusTick] = useState(0);
  const pollRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('al-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const fetchAll = useCallback(async () => {
    try {
      const [vRes, pRes, statsRes] = await Promise.all([
        vehicleApi.getAll(),
        pcbApi.getAll(),
        analyticsApi.getTodayStats(),
      ]);

      const vehicleData = (vRes.data || []).slice(0, MAX_VEHICLES);
      const pcbData = (pRes.data || []).slice(0, MAX_PCBS);

      setVehicles(vehicleData);
      setPcbs(pcbData);
      setTodayStats({
        entries: statsRes.data?.entries ?? 0,
        exits:   statsRes.data?.exits   ?? 0,
      });

      const locMap = {};
      pcbData.forEach(p => {
        if (p.PCBLocation && p.PCBLocation.latitude != null && p.PCBLocation.longitude != null) {
          locMap[p.pcb_id] = {
            lat: parseFloat(p.PCBLocation.latitude),
            lng: parseFloat(p.PCBLocation.longitude),
            updated: p.PCBLocation.last_updated,
          };
        } else if (p.latitude != null && p.longitude != null) {
          locMap[p.pcb_id] = {
            lat: parseFloat(p.latitude),
            lng: parseFloat(p.longitude),
            updated: p.last_updated,
          };
        }
      });
      setPcbLocations(locMap);
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchAll();
    setMapRefocusTick(t => t + 1);
  }, [fetchAll]);

  const connectWS = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState < 2) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => { setConnected(true); };
    ws.onclose = () => { setConnected(false); setTimeout(connectWS, 4000); };
    ws.onerror = (err) => { console.error('WS error', err); };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'LOCATION_UPDATE') {
          const { pcb_id, vin, latitude, longitude, battery, timestamp } = msg.data;
          setPcbLocations(prev => ({ ...prev, [pcb_id]: { lat: parseFloat(latitude), lng: parseFloat(longitude), updated: timestamp } }));
          setPcbs(prev => prev.map(p => p.pcb_id === pcb_id ? { ...p, battery_level: battery } : p));
          if (vin) setVehicles(prev => prev.map(v => v.vin === vin ? { ...v, last_movement_at: timestamp } : v));
        }
      } catch (e) { console.error('WS parse error', e); }
    };
  }, []);

  useEffect(() => {
    fetchAll();
    connectWS();
    pollRef.current = setInterval(fetchAll, 30000);
    return () => { clearInterval(pollRef.current); if (wsRef.current) wsRef.current.close(); };
  }, [fetchAll, connectWS]);

  const vehiclesWithLocation = vehicles.map(v => {
    const loc = pcbLocations[v.current_pcb_id];
    const pcb = pcbs.find(p => p.pcb_id === v.current_pcb_id);
    return { ...v, location: loc || null, battery_level: pcb ? parseFloat(pcb.battery_level) : null };
  });

  const inYardVehicles   = vehiclesWithLocation.filter(v => v.location != null);
  const inactiveVehicles = vehiclesWithLocation.filter(v => v.location == null);
  const goodBatteryPcbs     = pcbs.filter(p => p.battery_level != null && parseFloat(p.battery_level) >= 80);
  const moderateBatteryPcbs = pcbs.filter(p => p.battery_level != null && parseFloat(p.battery_level) < 80 && parseFloat(p.battery_level) > 30);
  const criticalBatteryPcbs = pcbs.filter(p => p.battery_level != null && parseFloat(p.battery_level) <= 30);
  const unknownBatteryPcbs  = pcbs.filter(p => p.battery_level == null);

  return (
    <AppContext.Provider value={{
      theme, toggleTheme,
      vehicles: vehiclesWithLocation, pcbs, pcbLocations,
      inYardVehicles, inactiveVehicles,
      goodBatteryPcbs, moderateBatteryPcbs, criticalBatteryPcbs, unknownBatteryPcbs,
      todayStats,
      connected, loading, refresh, mapRefocusTick,
      maxVehicles: MAX_VEHICLES, maxPcbs: MAX_PCBS,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);