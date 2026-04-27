import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { vehicleApi, pcbApi } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('al-theme') || 'light');
  const [vehicles, setVehicles] = useState([]);
  const [pcbs, setPcbs] = useState([]);
  const [pcbLocations, setPcbLocations] = useState({});   // pcb_id → { lat, lng, updated }
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

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

      // Build location map from PCB data (lat/lng come from pcb_location via JOIN if your API returns them)
      // Here we merge whatever location info is available
      const locMap = {};
      (pRes.data || []).forEach(p => {
        if (p.latitude != null && p.longitude != null) {
          locMap[p.pcb_id] = {
            lat: parseFloat(p.latitude),
            lng: parseFloat(p.longitude),
            updated: p.last_updated,
          };
        }
        // Also support nested PCBLocation association
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

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, 15000);
    return () => clearInterval(pollRef.current);
  }, [fetchAll]);

  /* ── derived data ── */
  // Vehicles with location info (PCB has a known coordinate)
  const vehiclesWithLocation = vehicles.map(v => {
    const loc = pcbLocations[v.current_pcb_id];
    return { ...v, location: loc || null };
  });

  const inYardVehicles  = vehiclesWithLocation.filter(v => v.location != null);
  const inactiveVehicles = vehiclesWithLocation.filter(v => v.location == null);

  return (
    <AppContext.Provider value={{
      theme, toggleTheme,
      vehicles: vehiclesWithLocation,
      pcbs,
      pcbLocations,
      inYardVehicles,
      inactiveVehicles,
      connected,
      loading,
      refresh: fetchAll,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
