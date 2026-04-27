import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Map, BarChart2, Moon, Sun, Plus, PanelLeftClose, PanelLeft, BatteryCharging } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import AssignUnitModal from '../common/AssignUnitModal';
import './Sidebar.css';

export default function Sidebar() {
  const { theme, toggleTheme, connected, vehicles, criticalBatteryPcbs } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = search.trim()
    ? vehicles.filter(v => v.vin.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        {/* Header */}
        <div className="sidebar__header">
          {!collapsed && (
            <div className="sidebar__brand">
              <div className="sidebar__logo">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="13" stroke="var(--teal-500)" strokeWidth="2"/>
                  <path d="M8 14 C8 10 11 8 14 8 C17 8 20 10 20 14" stroke="var(--teal-500)" strokeWidth="2" strokeLinecap="round" fill="none"/>
                  <circle cx="14" cy="14" r="3" fill="var(--teal-500)"/>
                  <path d="M14 17 L14 21" stroke="var(--teal-500)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="sidebar__brand-name">AL Tracker</div>
                <div className="sidebar__brand-sub">Vehicle Management</div>
              </div>
            </div>
          )}
          <button className="sidebar__collapse-btn" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? <PanelLeft size={18}/> : <PanelLeftClose size={18}/>}
          </button>
        </div>

        {!collapsed && (
          <>
            <div className="sidebar__section-label">NAVIGATION</div>

            <nav className="sidebar__nav">
              <NavLink to="/" end className={({isActive}) => `sidebar__nav-item ${isActive ? 'active' : ''}`}>
                <Map size={18}/>
                <span>Live Map</span>
              </NavLink>
              <NavLink to="/analytics" className={({isActive}) => `sidebar__nav-item ${isActive ? 'active' : ''}`}>
                <BarChart2 size={18}/>
                <span>Analytics</span>
              </NavLink>
              <NavLink to="/battery" className={({isActive}) => `sidebar__nav-item ${isActive ? 'active' : ''}`}>
                <BatteryCharging size={18}/>
                <span>Battery</span>
                {criticalBatteryPcbs && criticalBatteryPcbs.length > 0 && (
                  <span className="sidebar__nav-badge">{criticalBatteryPcbs.length}</span>
                )}
              </NavLink>
            </nav>

            {/* Search */}
            <div className="sidebar__search-wrap">
              <div className="sidebar__search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  placeholder="Search vehicle ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {filtered.length > 0 && (
                <div className="sidebar__search-results">
                  {filtered.map(v => (
                    <div key={v.vin} className="sidebar__search-item"
                      onClick={() => { navigate('/'); setSearch(''); }}>
                      <span className="search-vin">{v.vin}</span>
                      <span className="search-pcb">PCB {v.current_pcb_id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="sidebar__assign-btn" onClick={() => setShowAssign(true)}>
              <Plus size={16}/>
              Assign Unit
            </button>
          </>
        )}

        <div className="sidebar__footer">
          <button className="sidebar__theme-btn" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
            {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
        </div>
      </aside>

      {showAssign && <AssignUnitModal onClose={() => setShowAssign(false)}/>}
    </>
  );
}