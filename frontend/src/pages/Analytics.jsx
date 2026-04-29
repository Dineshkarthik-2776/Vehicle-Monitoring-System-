import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';
import { Download, Search, Truck, Cpu, Car, LogIn, LogOut, Activity, Battery } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip as LeafletTooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp, YARD_CENTER } from '../context/AppContext';
import { analyticsApi } from '../services/api';
import { generateAnalyticsPDF, generatePastReportPDF, generateStagedReportPDF } from '../services/pdfExport';
import { useNavigate } from 'react-router-dom';
import './Analytics.css';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TEAL   = '#14b88a';
const BLUE   = '#60a5fa';
const RED    = '#ef4444';
const AMBER  = '#f59e0b';
const PURPLE = '#a78bfa';

// ── Shared chart tooltip ───────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <div className="chart-tooltip__label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="chart-tooltip__row">
          <span className="chart-tooltip__dot" style={{ background: p.color || p.fill }} />
          <span className="chart-tooltip__name">{p.name}:</span>
          <span className="chart-tooltip__val">{p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

// ── Reusable card wrapper ──────────────────────────────────────────────────────
function ChartCard({ title, sub, children, className = '', badge = null }) {
  return (
    <div className={`chart-card ${className}`}>
      <div className="chart-card__header">
        <div>
          <div className="chart-card__title">{title}</div>
          {sub && <div className="chart-card__sub">{sub}</div>}
        </div>
        {badge}
      </div>
      <div className="chart-card__body">{children}</div>
    </div>
  );
}

// Pie label renderer
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.08) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
          fontSize={11} fontWeight={700}>{`${(percent * 100).toFixed(0)}%`}</text>
  );
};

// ── Circle Icon for Leaflet map ────────────────────────────────────────────────
function makeCircleIcon(color) {
  const svg = `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="7" fill="${color}" stroke="white" stroke-width="2.5"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [20, 20],
    iconAnchor: [10, 10],
    popupAnchor:[0, -12],
  });
}

// ── Custom Cluster Icon ──────────────────────────────────────────────────────
const createCustomClusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  let size = 'small';
  if (count > 10) size = 'medium';
  if (count > 50) size = 'large';
  
  return L.divIcon({
    html: `<div class="custom-cluster-icon cluster-${size}"><span>${count}</span></div>`,
    className: 'custom-cluster-marker',
    iconSize: L.point(40, 40, true),
  });
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function Analytics() {
  const {
    vehicles, pcbs,
    inYardVehicles, inactiveVehicles,
    stagedVehicles1, stagedVehicles2,
    todayStats,
    maxVehicles, maxPcbs,
  } = useApp();

  const [search,     setSearch]     = useState('');
  const [dailyData,  setDailyData]  = useState([]);
  const [pcbStatus,  setPcbStatus]  = useState({ available: 0, assigned: 0, faulty: 0 });
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [isDownloadingHistory, setIsDownloadingHistory] = useState(false);
  const [reportDropdownOpen, setReportDropdownOpen] = useState(false);
  const reportDropdownRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (reportDropdownRef.current && !reportDropdownRef.current.contains(e.target)) {
        setReportDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Fetch real chart data from backend
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [actRes, statusRes] = await Promise.all([
          analyticsApi.getDailyActivity(),
          analyticsApi.getPCBStatus(),
        ]);
        if (!cancelled) {
          setDailyData(actRes.data || []);
          setPcbStatus(statusRes.data || { available: 0, assigned: 0, faulty: 0 });
        }
      } catch (err) {
        console.warn('[Analytics] Chart data fetch failed:', err.message);
      } finally {
        if (!cancelled) setLoadingCharts(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    const isPcbSearch = q.startsWith('pcb');
    return vehicles.filter(v => {
      const matchVin = v.vin.toLowerCase().includes(q);
      const matchPcb = isPcbSearch && `pcb${v.current_pcb_id}`.includes(q);
      return matchVin || matchPcb;
    });
  }, [vehicles, search]);

  // ── PCB status data ─────────────────────────────────────────────────────────
  const pcbStatusBarData = [
    { label: 'Available', count: pcbStatus.available, fill: TEAL   },
    { label: 'Assigned',  count: pcbStatus.assigned,  fill: BLUE   },
    { label: 'Faulty',    count: pcbStatus.faulty,    fill: RED    },
  ];

  const pcbStatusPieData = pcbStatusBarData.map(d => ({ name: d.label, value: d.count, fill: d.fill }));

  // ── 7-day real activity chart ───────────────────────────────────────────────
  const activityChartData = dailyData.map(d => ({
    day:     d.label ? d.label.split(',')[0] : d.date,  // short day name
    entries: d.entries,
    exits:   d.exits,
  }));

  // ── No battery distribution (replaced by map) ─────────────────────────────

  function handleDownloadPDF() {
    generateAnalyticsPDF({
      inYardVehicles,
      inactiveVehicles,
      todayEntries: todayStats.entries,
      todayExits:   todayStats.exits,
    });
  }

  async function handleDownloadPastReport() {
    try {
      setIsDownloadingHistory(true);
      const res = await analyticsApi.getHistory();
      generatePastReportPDF({ history: res.data });
    } catch (err) {
      console.error('Failed to download past report:', err);
      alert('Failed to load history data for the report.');
    } finally {
      setIsDownloadingHistory(false);
    }
  }

  return (
    <div className="analytics">
      {/* ── Page header ── */}
      <div className="analytics__header">
        <div>
          <h1 className="analytics__title">Analytics</h1>
          <p className="analytics__sub">Fleet overview and live reports</p>
        </div>
      </div>

      {/* ── KPI stat cards ── */}
      <div className="analytics__stats analytics__stats--5">
        <StatCard icon={<LogIn  size={20}/>} value={todayStats.entries}   label="Today's Entries"   color="teal"   />
        <StatCard icon={<LogOut size={20}/>} value={todayStats.exits}     label="Today's Exits"     color="orange" />
        <StatCard icon={<Truck  size={20}/>} value={`${pcbStatus.assigned} / ${pcbs.length}`} label="Assigned Vehicles" color="teal" />
        <StatCard icon={<Car   size={20}/>} value={inYardVehicles.length} label="Vehicles in Yard"  color="orange" />
        <div className="stat-card report-dropdown-card" ref={reportDropdownRef}>
          <button className="report-dropdown-card__btn" onClick={() => setReportDropdownOpen(o => !o)}>
            <div className="stat-card__icon stat-card__icon--teal">
              <Download size={20}/>
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div className="stat-card__value">Export</div>
              <div className="stat-card__label">Generate Report</div>
            </div>
            <svg style={{ flexShrink: 0, transition: 'transform 0.2s', transform: reportDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {reportDropdownOpen && (
            <div className="report-dropdown-card__menu">
              <button className="report-dropdown-card__item" onClick={() => { handleDownloadPDF(); setReportDropdownOpen(false); }}>
                <span className="report-dropdown-card__dot" style={{ background: '#14b88a' }}/>
                Live Report
              </button>
              <button className="report-dropdown-card__item" onClick={() => { generateStagedReportPDF({ stagedVehicles1, stagedVehicles2 }); setReportDropdownOpen(false); }}>
                <span className="report-dropdown-card__dot" style={{ background: '#78350f' }}/>
                Staged Report
              </button>
              <button className="report-dropdown-card__item" onClick={() => { handleDownloadPastReport(); setReportDropdownOpen(false); }} disabled={isDownloadingHistory}>
                <span className="report-dropdown-card__dot" style={{ background: 'var(--text-secondary)' }}/>
                {isDownloadingHistory ? 'Loading...' : 'Past Report'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Charts row 1: PCB status bar + pie ── */}
      <div className="analytics__charts-row">
        <ChartCard
          title="PCB Status Distribution"
          sub="Count by operational status"
          className="analytics__chart--wide"
          badge={
            <div className="chart-badge-group">
              {pcbStatusBarData.map(d => (
                <span key={d.label} className="chart-badge" style={{ '--badge-color': d.fill }}>
                  <span className="chart-badge__dot" />
                  {d.label}: <b>{d.count}</b>
                </span>
              ))}
            </div>
          }
        >
          {loadingCharts ? <div className="chart-loading">Loading…</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pcbStatusBarData} barSize={52} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip unit=" PCBs" />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Bar dataKey="count" name="PCBs" radius={[6, 6, 0, 0]}>
                  {pcbStatusBarData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="PCB Status" sub="Available / Assigned / Faulty">
          {loadingCharts ? <div className="chart-loading">Loading…</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pcbStatusPieData} dataKey="value" nameKey="name"
                     cx="50%" cy="50%" outerRadius={78} labelLine={false} label={renderPieLabel}>
                  {pcbStatusPieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Charts row 2: 7-day activity + battery distribution ── */}
      <div className="analytics__charts-row">
        <ChartCard
          title="7-Day Activity"
          sub="Real entries &amp; exits from VehicleHistory"
          className="analytics__chart--wide"
        >
          {loadingCharts ? <div className="chart-loading">Loading…</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={activityChartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradEntries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={TEAL} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={TEAL} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradExits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={AMBER} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={AMBER} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, 'auto']} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="entries" name="Entries" stroke={TEAL}  strokeWidth={2}
                      fill="url(#gradEntries)" dot={{ r: 4, fill: TEAL,  strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="exits"   name="Exits"   stroke={AMBER} strokeWidth={2}
                      fill="url(#gradExits)"   dot={{ r: 4, fill: AMBER, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Vehicle Clusters" sub="Live density heatmap" className="analytics__cluster-card">
          <div className="analytics__cluster-map" style={{ height: '200px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
            <MapContainer center={[YARD_CENTER.lat, YARD_CENTER.lng]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={50}
                spiderfyOnMaxZoom={true}
                iconCreateFunction={createCustomClusterIcon}
              >
                {inYardVehicles.map(v => {
                  const loc = v.location;
                  if (!loc) return null;
                  return (
                    <Marker key={v.vin} position={[loc.lat, loc.lng]} icon={makeCircleIcon(TEAL)}>
                      <LeafletTooltip direction="top" offset={[0, -12]} opacity={1}>
                        <strong>{v.vin}</strong>
                      </LeafletTooltip>
                    </Marker>
                  );
                })}
              </MarkerClusterGroup>
            </MapContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── Staged Vehicles ── */}
      <StagedSection
        tier="stage2"
        label="Stage 2 — Over 30 Days"
        accent="#78350f"
        vehicles={stagedVehicles2}
      />
      <StagedSection
        tier="stage1"
        label="Stage 1 — 10 to 30 Days"
        accent="#f59e0b"
        vehicles={stagedVehicles1}
      />

      {/* ── Vehicle table ── */}
      <div className="analytics__card">
        <div className="analytics__card-header">
          <h2 className="analytics__card-title">All Vehicles ({vehicles.length})</h2>
        </div>
        <div className="analytics__search">
          <Search size={14}/>
          <input placeholder="Search by VIN or PCB ID..." value={search}
                 onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="analytics__vehicle-list">
          {filteredVehicles.length === 0 && (
            <div className="analytics__empty">No vehicles found</div>
          )}
          {filteredVehicles.map(v => (
            <VehicleRow key={v.vin} vehicle={v} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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

function VehicleRow({ vehicle }) {
  const loc        = vehicle.location;
  const battery    = vehicle.battery_level;
  const updatedStr = loc?.updated ? new Date(loc.updated).toLocaleString() : '—';

  return (
    <div className="veh-row">
      <div style={{ flex: '1', minWidth: '80px', display: 'flex', alignItems: 'center' }}>
        <span className="veh-row__vin">{vehicle.vin}</span>
      </div>
      <div style={{ flex: '2', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
        {loc ? (
          <span className="veh-row__loc">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
          </span>
        ) : (
          <span className="veh-row__loc" style={{ color: 'var(--text-muted)' }}>No GPS data</span>
        )}
      </div>
      <div style={{ flex: '1', minWidth: '100px', display: 'flex', alignItems: 'center' }}>
        <span className="veh-row__pcb">PCB{vehicle.current_pcb_id}</span>
      </div>
      <div style={{ flex: '1.5', minWidth: '120px', display: 'flex', alignItems: 'center', paddingRight: '16px' }}>
        <BatteryBar value={battery} />
      </div>
      <div style={{ flex: '1', minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <span className="veh-row__date">{updatedStr}</span>
      </div>
    </div>
  );
}

function BatteryBar({ value }) {
  const color = value == null ? '#9ca3af' : value > 60 ? TEAL : value > 30 ? AMBER : RED;
  return (
    <div className="batt-bar">
      <div className="batt-bar__track">
        <div className="batt-bar__fill" style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%`, background: color }} />
      </div>
      <span className="batt-bar__pct" style={{ color }}>
        {value != null ? `${Number(value).toFixed(0)}%` : '—'}
      </span>
    </div>
  );
}

/* ── Staged section (mirrors BatterySection) ── */
function StagedSection({ tier, label, accent, vehicles }) {
  const { setSelectVin } = useApp();
  const navigate = useNavigate();

  const handleCardClick = (vin) => {
    setSelectVin(vin);
    navigate('/');
  };

  return (
    <div className={`staged-section staged-section--${tier}`}>
      <div className="staged-section__header">
        <span className="staged-section__icon" style={{ color: accent }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </span>
        <div>
          <div className="staged-section__label">{label}</div>
          <div className="staged-section__count">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
      {vehicles.length === 0 ? (
        <div className="staged-section__empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" style={{ opacity: 0.4 }}>
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>No vehicles in this stage</span>
        </div>
      ) : (
        <div className="staged-section__grid">
          {vehicles.map(v => (
            <StagedVehicleCard key={v.vin} vehicle={v} accent={accent} tier={tier} onClick={() => handleCardClick(v.vin)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Staged vehicle card (mirrors PCBCard) ── */
function StagedVehicleCard({ vehicle, accent, tier, onClick }) {
  const days = Math.floor(vehicle.stageDays);
  const maxDays = tier === 'stage2' ? 90 : 30;
  const pct = Math.min(100, (days / maxDays) * 100);

  return (
    <div className={`staged-card staged-card--${tier}`} onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="staged-card__top">
        <span className="staged-card__vin">{vehicle.vin}</span>
        <span className={`staged-card__badge staged-card__badge--${tier}`}>
          {tier === 'stage2' ? '> 30d' : '10–30d'}
        </span>
      </div>
      <div className="staged-card__days" style={{ color: accent }}>{days} days</div>
      <div className="staged-card__bar-wrap">
        <div className="staged-card__bar-fill" style={{ width: `${pct}%`, background: accent }} />
      </div>
      <div className="staged-card__meta">
        <span>PCB{vehicle.current_pcb_id}</span>
      </div>
    </div>
  );
}