import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { vehicleApi, pcbApi } from '../services/api';

const AppContext = createContext(null);

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('al-theme') || 'light');
  const [vehicles, setVehicles] = useState([]);
  const [pcbs, setPcbs] = useState([]);
  const [pcbLocations, setPcbLocations] = useState({});   // pcb_id → { lat, lng, updated }
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);
  const wsRef = useRef(null);

  /* ── theme ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('al-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  /* ── fetch data ── */
  const fetchAll = useCallback(async () => {
    try {
      const [vRes, pRes] = await Promise.all([
        vehicleApi.getAll(),
        pcbApi.getAll(),
      ]);
      setVehicles(vRes.data || []);
      setPcbs(pRes.data || []);

      const locMap = {};
      (pRes.data || []).forEach(p => {
        if (p.latitude != null && p.longitude != null) {
          locMap[p.pcb_id] = {
            lat: parseFloat(p.latitude),
            lng: parseFloat(p.longitude),
            updated: p.last_updated,
          };
        }
        if (p.PCBLocation) {
          locMap[p.pcb_id] = {
            lat: parseFloat(p.PCBLocation.latitude),
            lng: parseFloat(p.PCBLocation.longitude),
            updated: p.PCBLocation.last_updated,
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

  /* ── WebSocket ── */
  const connectWS = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState < 2) return; // already open/connecting

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WS connected');
      setConnected(true);
    };

    ws.onclose = () => {
      console.log('WS disconnected, reconnecting in 4s...');
      setConnected(false);
      setTimeout(connectWS, 4000);
    };

    ws.onerror = (err) => {
      console.error('WS error', err);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'LOCATION_UPDATE') {
          const { pcb_id, vin, latitude, longitude, battery, timestamp } = msg.data;

          // Update pcbLocations live
          setPcbLocations(prev => ({
            ...prev,
            [pcb_id]: {
              lat: parseFloat(latitude),
              lng: parseFloat(longitude),
              updated: timestamp,
            },
          }));

          // Update battery level in pcbs list live
          setPcbs(prev =>
            prev.map(p =>
              p.pcb_id === pcb_id
                ? { ...p, battery_level: battery }
                : p
            )
          );

          // Update vehicle last_movement_at live
          if (vin) {
            setVehicles(prev =>
              prev.map(v =>
                v.vin === vin
                  ? { ...v, last_movement_at: timestamp }
                  : v
              )
            );
          }
        }
      } catch (e) {
        console.error('WS message parse error', e);
      }
    };
  }, []);

  useEffect(() => {
    fetchAll();
    connectWS();
    // Polling as fallback for REST data (every 30s)
    pollRef.current = setInterval(fetchAll, 30000);
    return () => {
      clearInterval(pollRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [fetchAll, connectWS]);

  /* ── derived data ── */
  const vehiclesWithLocation = vehicles.map(v => {
    const loc = pcbLocations[v.current_pcb_id];
    const pcb = pcbs.find(p => p.pcb_id === v.current_pcb_id);
    return {
      ...v,
      location: loc || null,
      battery_level: pcb ? parseFloat(pcb.battery_level) : null,
    };
  });

  const inYardVehicles = vehiclesWithLocation.filter(v => v.location != null);
  const inactiveVehicles = vehiclesWithLocation.filter(v => v.location == null);

  // Battery categories from all PCBs
  const goodBatteryPcbs     = pcbs.filter(p => parseFloat(p.battery_level) >= 80);
  const moderateBatteryPcbs = pcbs.filter(p => parseFloat(p.battery_level) < 80 && parseFloat(p.battery_level) > 30);
  const criticalBatteryPcbs = pcbs.filter(p => parseFloat(p.battery_level) <= 30 && p.battery_level != null);
  const unknownBatteryPcbs  = pcbs.filter(p => p.battery_level == null);

  return (
    <AppContext.Provider value={{
      theme, toggleTheme,
      vehicles: vehiclesWithLocation,
      pcbs,
      pcbLocations,
      inYardVehicles,
      inactiveVehicles,
      goodBatteryPcbs,
      moderateBatteryPcbs,
      criticalBatteryPcbs,
      unknownBatteryPcbs,
      connected,
      loading,
      refresh: fetchAll,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);