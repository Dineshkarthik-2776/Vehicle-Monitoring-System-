import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Map, BarChart2, Moon, Sun, Plus, PanelLeftClose, PanelLeft, BatteryCharging, Unplug, RefreshCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import AssignUnitModal from '../common/AssignUnitModal';
import DetachUnitModal from '../common/DetachUnitModal';
import SwapUnitModal from '../common/SwapUnitModal';
import './Sidebar.css';

export default function Sidebar() {
  const { theme, toggleTheme, connected, vehicles, criticalBatteryPcbs, setSelectVin } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showDetach, setShowDetach] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const isLiveMap = location.pathname === '/';
  const q = search.trim().toLowerCase();
  const isPcbSearch = q.startsWith('pcb');

  const filtered = q
    ? vehicles.filter(v => {
        const matchVin = v.vin.toLowerCase().includes(q);
        const matchPcb = isPcbSearch && `pcb${v.current_pcb_id}`.includes(q);
        return matchVin || matchPcb;
      })
    : [];

  function handleSearchSelect(v) {
    setSearch('');
    navigate('/');              // go to Live Map
    setSelectVin(v.vin);       // tell LiveMap to fly to this vehicle and open popup
  }

  // Shared nav items data
  const navItems = [
    { to: '/',          icon: <Map size={18}/>,            label: 'Live Map',  badge: null },
    { to: '/analytics', icon: <BarChart2 size={18}/>,      label: 'Analytics', badge: null },
    {
      to: '/battery',
      icon: <BatteryCharging size={18}/>,
      label: 'Battery',
      badge: criticalBatteryPcbs?.length > 0 ? criticalBatteryPcbs.length : null,
    },
  ];

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
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

        {/* ── Navigation — shown in BOTH expanded and collapsed modes ─────── */}
        {!collapsed && <div className="sidebar__section-label">NAVIGATION</div>}

        <nav className={`sidebar__nav ${collapsed ? 'sidebar__nav--collapsed' : ''}`}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `sidebar__nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="sidebar__nav-badge">{item.badge}</span>
              )}
              {/* Collapsed: show badge as dot above icon */}
              {collapsed && item.badge && (
                <span className="sidebar__nav-badge--dot" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Search — only in expanded mode ──────────────────────────────── */}
        {!collapsed && (
          <>
            <div className="sidebar__search-wrap">
              <div className="sidebar__search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  placeholder="Search by VIN or PCB ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && filtered.length > 0) handleSearchSelect(filtered[0]);
                    if (e.key === 'Escape') setSearch('');
                  }}
                />
                {search && (
                  <button className="sidebar__search-clear" onClick={() => setSearch('')} aria-label="Clear">✕</button>
                )}
              </div>
              {filtered.length > 0 && (
                <div className="sidebar__search-results">
                  {filtered.map(v => (
                    <div key={v.vin} className="sidebar__search-item"
                      onClick={() => handleSearchSelect(v)}>
                      <div>
                        <span className="search-vin">{v.vin}</span>
                        {v.location && (
                          <span className="search-loc">
                            {v.location.lat.toFixed(4)}, {v.location.lng.toFixed(4)}
                          </span>
                        )}
                      </div>
                      <span className="search-pcb" style={{ fontWeight: 'bold' }}>PCB{v.current_pcb_id}</span>
                    </div>
                  ))}
                </div>
              )}
              {search.trim() && filtered.length === 0 && (
                <div className="sidebar__search-results">
                  <div className="sidebar__search-empty">No vehicles found</div>
                </div>
              )}
            </div>

            {isLiveMap && (
              <div className="sidebar__pcb-actions">
                <button className="sidebar__assign-btn" onClick={() => setShowAssign(true)}>
                  <Plus size={16}/> Assign Unit
                </button>
                <button className="sidebar__assign-btn sidebar__btn--detach" onClick={() => setShowDetach(true)}>
                  <Unplug size={16}/> Detach Unit
                </button>
                <button className="sidebar__assign-btn sidebar__btn--swap" onClick={() => setShowSwap(true)}>
                  <RefreshCcw size={16}/> Swap Unit
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Collapsed: show assign button as icon-only ───────────────────── */}
        {collapsed && isLiveMap && (
          <div className="sidebar__pcb-actions">
            <button className="sidebar__assign-btn sidebar__assign-btn--icon" onClick={() => setShowAssign(true)} title="Assign Unit">
              <Plus size={18}/>
            </button>
            <button className="sidebar__assign-btn sidebar__assign-btn--icon sidebar__btn--detach" onClick={() => setShowDetach(true)} title="Detach Unit">
              <Unplug size={18}/>
            </button>
            <button className="sidebar__assign-btn sidebar__assign-btn--icon sidebar__btn--swap" onClick={() => setShowSwap(true)} title="Swap Unit">
              <RefreshCcw size={18}/>
            </button>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="sidebar__footer">
          <button className="sidebar__theme-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
            {theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
            {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
        </div>
      </aside>

      {showAssign && <AssignUnitModal onClose={() => setShowAssign(false)}/>}
      {showDetach && <DetachUnitModal onClose={() => setShowDetach(false)}/>}
      {showSwap && <SwapUnitModal onClose={() => setShowSwap(false)}/>}
    </>
  );
}