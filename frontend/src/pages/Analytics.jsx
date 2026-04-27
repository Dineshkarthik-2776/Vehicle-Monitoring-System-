import React, { useState, useMemo } from 'react';
import { Download, Search, ToggleLeft, ToggleRight, Truck, LogIn, LogOut, Warehouse } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateAnalyticsPDF } from '../services/pdfExport';
import './Analytics.css';

export default function Analytics() {
  const { inYardVehicles, inactiveVehicles, vehicles } = useApp();
  const [search, setSearch] = useState('');
  const [toggled, setToggled] = useState({});
  const [toggleAll, setToggleAll] = useState(false);

  // Simulate today's entries/exits (in a real app these come from vehicle_history)
  const todayEntries = 0;
  const todayExits = 0;

  const filteredInYard = useMemo(() => {
    const q = search.toLowerCase();
    return inYardVehicles.filter(v =>
      v.vin.toLowerCase().includes(q) ||
      String(v.current_pcb_id).includes(q)
    );
  }, [inYardVehicles, search]);

  function handleToggleAll() {
    const next = !toggleAll;
    setToggleAll(next);
    const map = {};
    inYardVehicles.forEach(v => { map[v.vin] = next; });
    setToggled(map);
  }

  function handleToggle(vin) {
    setToggled(t => ({ ...t, [vin]: !t[vin] }));
  }

  function handleDownloadPDF() {
    generateAnalyticsPDF({ inYardVehicles, inactiveVehicles, todayEntries, todayExits });
  }

  return (
    <div className="analytics">
      {/* Page header */}
      <div className="analytics__header">
        <div>
          <h1 className="analytics__title">Analytics</h1>
          <p className="analytics__sub">Fleet overview and reports</p>
        </div>
        <button className="analytics__pdf-btn" onClick={handleDownloadPDF}>
          <Download size={15}/>
          Download PDF
        </button>
      </div>

      {/* Stat cards */}
      <div className="analytics__stats">
        <StatCard
          icon={<LogIn size={22}/>}
          value={todayEntries}
          label="Today's Entries"
          color="orange"
        />
        <StatCard
          icon={<LogOut size={22}/>}
          value={todayExits}
          label="Today's Exits"
          color="orange"
        />
        <StatCard
          icon={<Warehouse size={22}/>}
          value={inYardVehicles.length}
          label="In Yard Now"
          color="teal"
        />
      </div>

      {/* In Yard section */}
      <div className="analytics__card">
        <div className="analytics__card-header">
          <h2 className="analytics__card-title">Vehicles in Yard</h2>
          <button className="analytics__toggle-all" onClick={handleToggleAll}>
            Toggle All
          </button>
        </div>

        <div className="analytics__search">
          <Search size={14}/>
          <input
            placeholder="Search vehicle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="analytics__vehicle-list">
          {filteredInYard.length === 0 && (
            <div className="analytics__empty">No vehicles in yard</div>
          )}
          {filteredInYard.map(v => (
            <VehicleRow
              key={v.vin}
              vehicle={v}
              checked={!!toggled[v.vin]}
              onToggle={() => handleToggle(v.vin)}
            />
          ))}
        </div>
      </div>

      {/* Inactive / Assigned but not active */}
      {inactiveVehicles.length > 0 && (
        <div className="analytics__inactive-card">
          <div className="analytics__inactive-header">
            <LogOut size={16}/>
            <span>Assigned but not active</span>
          </div>
          <div className="analytics__inactive-grid">
            {inactiveVehicles.map(v => (
              <div key={v.vin} className="analytics__inactive-item">
                <div className="analytics__inactive-vin">{v.vin}</div>
                <div className="analytics__inactive-pcb">PCB: <span>PCB{v.current_pcb_id}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-card__icon stat-card__icon--${color}`}>{icon}</div>
      <div>
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
      </div>
    </div>
  );
}

function VehicleRow({ vehicle, checked, onToggle }) {
  const loc = vehicle.location;
  const updatedStr = loc?.updated
    ? new Date(loc.updated).toLocaleString()
    : '—';

  return (
    <div className={`veh-row ${checked ? 'veh-row--checked' : ''}`}>
      <div className="veh-row__left">
        <button
          className={`veh-row__check ${checked ? 'checked' : ''}`}
          onClick={onToggle}
        >
          {checked && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <div>
          <div className="veh-row__vin">{vehicle.vin}</div>
          <div className="veh-row__meta">
            {loc && (
              <span className="veh-row__loc">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
              </span>
            )}
            {vehicle.battery_level != null && (
              <span className="veh-row__battery">Battery: {vehicle.battery_level}%</span>
            )}
          </div>
        </div>
      </div>
      <div className="veh-row__right">
        <span className="veh-row__pcb">PCB: PCB{vehicle.current_pcb_id}</span>
        <span className="veh-row__date">{updatedStr}</span>
      </div>
    </div>
  );
}
