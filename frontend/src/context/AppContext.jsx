import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { vehicleApi, pcbApi, analyticsApi } from '../services/api';

const AppContext = createContext(null);

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';

// ── Single source of truth for map centre ─────────────────────────────────────
// Change YARD_CENTER here and it will update the Live Map and all fly-to logic.
export const YARD_CENTER = {
  lat: 13.209114773647052,
  lng: 80.31939877710973,
};
// ─────────────────────────────────────────────────────────────────────────────

const MAX_VEHICLES = 500;
const MAX_PCBS = 500;

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('al-theme') || 'light');
  const [vehicles, setVehicles] = useState([]);
  const [pcbs, setPcbs] = useState([]);
  const [pcbLocations, setPcbLocations] = useState({}); // pcb_id → { lat, lng, updated }
  const [todayStats, setTodayStats] = useState({ entries: 0, exits: 0 });
  const [connected, setConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapRefocusTick, setMapRefocusTick] = useState(0);
  const [selectVin, setSelectVin] = useState(null); // vin to fly to & open popup

  // Navigation states
  const [userLocation, setUserLocation] = useState(null);
  const [routeTarget, setRouteTarget] = useState(null); // { lat, lng }
  const [routePath, setRoutePath] = useState([]);

  const pollRef = useRef(null);
  const wsRef = useRef(null);
  const wsRetryRef = useRef(null);
  const isMounted = useRef(true);

  // ── Theme ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('al-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  // ── Fetch from database ───────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [vRes, pRes, statsRes] = await Promise.all([
        vehicleApi.getAll(),
        pcbApi.getAll(),
        analyticsApi.getTodayStats(),
      ]);

      if (!isMounted.current) return;

      const vehicleData = (vRes.data || []).slice(0, MAX_VEHICLES);
      const pcbData = (pRes.data || []).slice(0, MAX_PCBS);

      setVehicles(vehicleData);
      setPcbs(pcbData);
      setTodayStats({
        entries: statsRes.data?.entries ?? 0,
        exits: statsRes.data?.exits ?? 0,
      });

      // ── Build location map ──────────────────────────────────────────────
      // Priority 1: vehicle→PCB→PCBLocation (from getAllVehicles join)
      // Priority 2: PCB→PCBLocation (from getPCB join)
      const locMap = {};

      // From vehicle response (PCB.PCBLocation nested)
      vehicleData.forEach(v => {
        const loc = v.PCB?.PCBLocation;
        if (loc && loc.latitude != null && loc.longitude != null) {
          locMap[v.current_pcb_id] = {
            lat: parseFloat(loc.latitude),
            lng: parseFloat(loc.longitude),
            updated: loc.last_updated,
          };
        }
      });

      // From PCB response (PCBLocation nested) — fills any gaps
      pcbData.forEach(p => {
        if (locMap[p.pcb_id]) return; // already populated from vehicle
        if (p.PCBLocation && p.PCBLocation.latitude != null && p.PCBLocation.longitude != null) {
          locMap[p.pcb_id] = {
            lat: parseFloat(p.PCBLocation.latitude),
            lng: parseFloat(p.PCBLocation.longitude),
            updated: p.PCBLocation.last_updated,
          };
        }
      });

      console.log('[DB] Vehicles:', vehicleData.length, '| PCBs:', pcbData.length, '| Locations:', Object.keys(locMap).length);
      setPcbLocations(locMap);
      setConnected(true);
    } catch (err) {
      console.error('[DB] Fetch error:', err.message);
      if (isMounted.current) setConnected(false);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);


  // ── Refresh = DB fetch only. Does NOT touch the WebSocket. ────────────────
  const refresh = useCallback(async () => {
    await fetchAll();
    setMapRefocusTick(t => t + 1);
  }, [fetchAll]);

  // ── WebSocket connection (opened once on mount, auto-reconnects) ──────────
  const connectWS = useCallback(() => {
    // Guard: already open or in the process of opening — skip.
    if (wsRef.current && wsRef.current.readyState < 2) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (isMounted.current) {
        console.log('[WS] Connected');
        setWsConnected(true);
        setConnected(true);
      }
    };

    // onclose fires for genuine network drops → schedule reconnect.
    // NOTE: we null this handler before a deliberate ws.close() in cleanup,
    // so it does NOT fire on intentional unmounts (StrictMode / HMR).
    ws.onclose = () => {
      if (!isMounted.current) return;
      console.log('[WS] Disconnected — reconnecting in 4 s');
      setWsConnected(false);
      wsRetryRef.current = setTimeout(connectWS, 4000);
    };

    ws.onerror = () => {
      // onerror is always followed by onclose; let onclose handle the retry.
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'CONNECTED') {
          console.log('[WS]', msg.message);
          return;
        }

        if (msg.type === 'LOCATION_UPDATE') {
          const { pcb_id, vin, latitude, longitude, battery, timestamp } = msg.data;

          setPcbLocations(prev => ({
            ...prev,
            [pcb_id]: {
              lat: parseFloat(latitude),
              lng: parseFloat(longitude),
              updated: timestamp,
            },
          }));

          setPcbs(prev => prev.map(p =>
            p.pcb_id === pcb_id ? { ...p, battery_level: battery } : p
          ));

          if (vin) {
            setVehicles(prev => prev.map(v =>
              v.vin === vin ? { ...v, last_movement_at: timestamp } : v
            ));
          }
        }
      } catch (e) {
        console.error('[WS] Parse error:', e.message);
      }
    };
  }, []);

  // ── Bootstrap: DB fetch + WS connect once on mount ────────────────────────
  useEffect(() => {
    isMounted.current = true;
    fetchAll();
    connectWS();
    pollRef.current = setInterval(fetchAll, 30_000);

    return () => {
      isMounted.current = false;
      clearInterval(pollRef.current);
      clearTimeout(wsRetryRef.current);
      // ── Null the onclose handler BEFORE closing so it does not fire ──
      // This prevents React StrictMode / HMR from triggering the auto-reconnect
      // loop on intentional unmounts.
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [fetchAll, connectWS]);

  // ── Navigation (User GPS & Route Fetching) ─────────────────────────────────
  useEffect(() => {
    if (!routeTarget) {
      setUserLocation(null);
      setRoutePath([]);
      return;
    }

    let watchId;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting user location:", error);
          if (error.code === 1) {
            // Only alert once per session roughly, or just console.error
            console.error("Location permission denied.");
          }
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );
    } else {
      console.error("Geolocation is not supported by your browser.");
    }

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [routeTarget]);

  useEffect(() => {
    if (userLocation && routeTarget) {
      const { lat: uLat, lng: uLng } = userLocation;
      const { lat: tLat, lng: tLng } = routeTarget;

      const url = `https://router.project-osrm.org/route/v1/driving/${uLng},${uLat};${tLng},${tLat}?overview=full&geometries=geojson`;

      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates;
            // OSRM returns [lng, lat], Leaflet polyline expects [lat, lng]
            const latLngs = coords.map(c => [c[1], c[0]]);
            setRoutePath(latLngs);
          }
        })
        .catch(err => console.error("Error fetching route:", err));
    }
  }, [userLocation, routeTarget]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const vehiclesWithLocation = vehicles.map(v => {
    const loc = pcbLocations[v.current_pcb_id];
    const pcb = pcbs.find(p => p.pcb_id === v.current_pcb_id);
    return {
      ...v,
      location: loc || null,
      battery_level: pcb ? (pcb.battery_level != null ? parseFloat(pcb.battery_level) : null) : null,
    };
  });

  const now = Date.now();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const stagedVehicles1 = [];
  const stagedVehicles2 = [];

  vehiclesWithLocation.forEach(v => {
    const baseDateStr = v.last_movement_at || v.assigned_at;
    if (baseDateStr) {
      const daysStaged = (now - new Date(baseDateStr).getTime()) / MS_PER_DAY;
      v.stageDays = daysStaged;
      v.stageTier = daysStaged > 30 ? 2 : daysStaged >= 10 ? 1 : 0;

      if (v.stageTier === 2) {
        stagedVehicles2.push(v);
      } else if (v.stageTier === 1) {
        stagedVehicles1.push(v);
      }
    } else {
      v.stageDays = 0;
      v.stageTier = 0;
    }
  });

  const inYardVehicles = vehiclesWithLocation.filter(v => v.location != null);
  const inactiveVehicles = vehiclesWithLocation.filter(v => v.location == null);

  // Battery tier groupings (for analytics)
  const goodBatteryPcbs = pcbs.filter(p => p.battery_level != null && parseFloat(p.battery_level) > 80);
  const moderateBatteryPcbs = pcbs.filter(p => p.battery_level != null && parseFloat(p.battery_level) >= 30 && parseFloat(p.battery_level) <= 80);
  const criticalBatteryPcbs = pcbs.filter(p => p.battery_level != null && parseFloat(p.battery_level) < 30);
  const unknownBatteryPcbs = pcbs.filter(p => p.battery_level == null);

  return (
    <AppContext.Provider value={{
      theme, toggleTheme,
      vehicles: vehiclesWithLocation,
      pcbs,
      pcbLocations,
      inYardVehicles,
      inactiveVehicles,
      stagedVehicles1, stagedVehicles2,
      goodBatteryPcbs, moderateBatteryPcbs, criticalBatteryPcbs, unknownBatteryPcbs,
      todayStats,
      connected: connected || wsConnected,
      wsConnected,
      loading,
      refresh,
      mapRefocusTick,
      selectVin, setSelectVin,
      userLocation, routeTarget, setRouteTarget, routePath,
      maxVehicles: MAX_VEHICLES,
      maxPcbs: MAX_PCBS,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);