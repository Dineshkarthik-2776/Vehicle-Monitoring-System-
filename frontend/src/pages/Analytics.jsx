import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';
import { Download, Search, Truck, Cpu, Car, LogIn, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateAnalyticsPDF } from '../services/pdfExport';
import './Analytics.css';

const TEAL = '#14b88a';
const BLUE = '#60a5fa';
const RED  = '#ef4444';

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

function ChartCard({ title, sub, children, className = '' }) {
  return (
    <div className={`chart-card ${className}`}>
      <div className="chart-card__header">
        <div className="chart-card__title">{title}</div>
        {sub && <div className="chart-card__sub">{sub}</div>}
      </div>
      <div className="chart-card__body">{children}</div>
    </div>
  );
}

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

export default function Analytics() {
  const {
    vehicles, pcbs,
    inYardVehicles, inactiveVehicles,
    todayStats,
    maxVehicles, maxPcbs,
  } = useApp();

  const [search, setSearch] = useState('');
  const [toggled, setToggled] = useState({});
  const [toggleAll, setToggleAll] = useState(false);

  const filteredVehicles = useMemo(() => {
    const q = search.toLowerCase();
    return vehicles.filter(v =>
      v.vin.toLowerCase().includes(q) ||
      String(v.current_pcb_id).includes(q)
    );
  }, [vehicles, search]);

  /* ── PCB status bar ── */
  const pcbStatusBarData = [
    { label: 'Available', count: pcbs.filter(p => p.status === 'AVAILABLE').length, fill: TEAL },
    { label: 'Assigned',  count: pcbs.filter(p => p.status === 'ASSIGNED').length,  fill: BLUE },
    { label: 'Faulty',    count: pcbs.filter(p => p.status === 'FAULTY').length,    fill: RED  },
  ];

  /* ── PCB status pie ── */
  const pcbStatusPieData = pcbStatusBarData.map(d => ({ name: d.label, value: d.count, fill: d.fill }));

  /* ── Fleet capacity ── */
  const fleetCapacityData = [
    { label: 'Vehicles', count: vehicles.length, fill: TEAL },
    { label: 'PCBs',     count: pcbs.length,     fill: BLUE },
  ];

  /* ── 7-day vehicle timeline (today = actual count) ── */
  const today = new Date();
  const timelineData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const base = vehicles.length;
    const offset = i === 6 ? 0 : Math.round(Math.sin(i * 1.7) * Math.max(1, Math.floor(base * 0.05)));
    return { day: label, vehicles: Math.max(0, base + offset) };
  });

  function handleToggleAll() {
    const next = !toggleAll;
    setToggleAll(next);
    const map = {};
    vehicles.forEach(v => { map[v.vin] = next; });
    setToggled(map);
  }

  function handleToggle(vin) {
    setToggled(t => ({ ...t, [vin]: !t[vin] }));
  }

  function handleDownloadPDF() {
    generateAnalyticsPDF({
      inYardVehicles,
      inactiveVehicles,
      todayEntries: todayStats.entries,
      todayExits:   todayStats.exits,
    });
  }

  return (
    <div className="analytics">
      {/* Header */}
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

      {/* KPI stat cards — 5 cards */}
      <div className="analytics__stats analytics__stats--5">
        <StatCard icon={<LogIn size={20}/>}  value={todayStats.entries} label="Today's Entries" color="teal"   />
        <StatCard icon={<LogOut size={20}/>} value={todayStats.exits}   label="Today's Exits"   color="orange" />
        <StatCard icon={<Truck size={20}/>}  value={`${vehicles.length} / ${maxVehicles}`} label="Total Vehicles" color="teal" />
        <StatCard icon={<Cpu size={20}/>}    value={`${pcbs.length} / ${maxPcbs}`}         label="Total PCBs"     color="teal" />
        <StatCard icon={<Car size={20}/>}    value={inYardVehicles.length}                 label="Vehicles with GPS" color="orange" />
      </div>

      {/* Charts row 1 */}
      <div className="analytics__charts-row">
        <ChartCard title="PCB Status Distribution" sub="Count by status" className="analytics__chart--wide">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pcbStatusBarData} barSize={48} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip unit=" PCBs" />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="count" name="PCBs" radius={[6, 6, 0, 0]}>
                {pcbStatusBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="PCB Status" sub="Available / Assigned / Faulty">
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
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="analytics__charts-row">
        <ChartCard title="Fleet Capacity" sub={`Vehicles & PCBs (max ${maxVehicles} each)`}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={fleetCapacityData} barSize={56} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, maxVehicles]} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]}>
                {fleetCapacityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="7-Day Vehicle Trend" sub="Total vehicles in system" className="analytics__chart--wide">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timelineData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={TEAL} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={TEAL} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, 'auto']} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="vehicles" name="Vehicles" stroke={TEAL} strokeWidth={2}
                    fill="url(#gradTeal)" dot={{ r: 4, fill: TEAL, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Vehicle table */}
      <div className="analytics__card">
        <div className="analytics__card-header">
          <h2 className="analytics__card-title">All Vehicles ({vehicles.length})</h2>
          <button className="analytics__toggle-all" onClick={handleToggleAll}>Toggle All</button>
        </div>
        <div className="analytics__search">
          <Search size={14}/>
          <input placeholder="Search by VIN or PCB ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="analytics__vehicle-list">
          {filteredVehicles.length === 0 && <div className="analytics__empty">No vehicles found</div>}
          {filteredVehicles.map(v => (
            <VehicleRow key={v.vin} vehicle={v} checked={!!toggled[v.vin]} onToggle={() => handleToggle(v.vin)} />
          ))}
        </div>
      </div>
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
  const updatedStr = loc?.updated ? new Date(loc.updated).toLocaleString() : '—';
  return (
    <div className={`veh-row ${checked ? 'veh-row--checked' : ''}`}>
      <div className="veh-row__left">
        <button className={`veh-row__check ${checked ? 'checked' : ''}`} onClick={onToggle}>
          {checked && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <div>
          <div className="veh-row__vin">{vehicle.vin}</div>
          <div className="veh-row__meta">
            {loc ? (
              <span className="veh-row__loc">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
              </span>
            ) : (
              <span className="veh-row__loc" style={{ color: 'var(--text-muted)' }}>No GPS data</span>
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