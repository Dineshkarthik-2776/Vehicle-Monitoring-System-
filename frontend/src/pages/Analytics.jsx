import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  RadialBarChart, RadialBar, AreaChart, Area,
} from 'recharts';
import { Download, Search, Truck, LogIn, LogOut, Warehouse, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateAnalyticsPDF } from '../services/pdfExport';
import './Analytics.css';

/* ── colours ── */
const TEAL    = '#14b88a';
const AMBER   = '#f59e0b';
const RED     = '#ef4444';
const SLATE   = '#6b7280';
const TEAL_DIM = '#ccfbee';

/* ── custom tooltip ── */
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

/* ── chart card wrapper ── */
function ChartCard({ title, sub, children, className = '' }) {
  return (
    <div className={`chart-card ${className}`}>
      <div className="chart-card__header">
        <div>
          <div className="chart-card__title">{title}</div>
          {sub && <div className="chart-card__sub">{sub}</div>}
        </div>
      </div>
      <div className="chart-card__body">{children}</div>
    </div>
  );
}

export default function Analytics() {
  const { inYardVehicles, inactiveVehicles, vehicles, pcbs,
          goodBatteryPcbs, moderateBatteryPcbs, criticalBatteryPcbs, unknownBatteryPcbs } = useApp();
  const [search, setSearch] = useState('');
  const [toggled, setToggled] = useState({});
  const [toggleAll, setToggleAll] = useState(false);

  const todayEntries = 0;
  const todayExits   = 0;

  const filteredInYard = useMemo(() => {
    const q = search.toLowerCase();
    return inYardVehicles.filter(v =>
      v.vin.toLowerCase().includes(q) ||
      String(v.current_pcb_id).includes(q)
    );
  }, [inYardVehicles, search]);

  /* ── chart data ── */

  // 1. Battery distribution bar chart
  const batteryDistData = [
    { range: '0–20%',   count: pcbs.filter(p => parseFloat(p.battery_level) <= 20).length,                                       fill: '#ef4444' },
    { range: '21–40%',  count: pcbs.filter(p => parseFloat(p.battery_level) > 20 && parseFloat(p.battery_level) <= 40).length,   fill: '#f59e0b' },
    { range: '41–60%',  count: pcbs.filter(p => parseFloat(p.battery_level) > 40 && parseFloat(p.battery_level) <= 60).length,   fill: '#eab308' },
    { range: '61–80%',  count: pcbs.filter(p => parseFloat(p.battery_level) > 60 && parseFloat(p.battery_level) <= 80).length,   fill: '#84cc16' },
    { range: '81–100%', count: pcbs.filter(p => parseFloat(p.battery_level) > 80).length,                                        fill: '#14b88a' },
  ];

  // 2. Fleet status pie
  const fleetStatusData = [
    { name: 'In Yard',  value: inYardVehicles.length,   fill: TEAL  },
    { name: 'Inactive', value: inactiveVehicles.length, fill: AMBER },
  ];

  // 3. PCB status pie
  const pcbStatusData = [
    { name: 'Available', value: pcbs.filter(p => p.status === 'AVAILABLE').length, fill: TEAL  },
    { name: 'Assigned',  value: pcbs.filter(p => p.status === 'ASSIGNED').length,  fill: '#60a5fa' },
    { name: 'Faulty',    value: pcbs.filter(p => p.status === 'FAULTY').length,    fill: RED   },
  ];

  // 4. Battery health radial (for active/assigned PCBs)
  const radialData = [
    { name: 'Good',     value: goodBatteryPcbs.length,     fill: TEAL  },
    { name: 'Moderate', value: moderateBatteryPcbs.length, fill: AMBER },
    { name: 'Critical', value: criticalBatteryPcbs.length, fill: RED   },
  ];

  // 5. Simulated timeline (vehicle count over last 7 days — seeded deterministically)
  const today = new Date();
  const timelineData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    // use actual in-yard count for today, simulate for past days
    const base = inYardVehicles.length;
    const offset = i === 6 ? 0 : Math.round(Math.sin(i * 1.3) * 2);
    return { day: label, vehicles: Math.max(0, base + offset), entries: Math.max(0, 1 + (i % 3)), exits: Math.max(0, i % 2) };
  });

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

  /* ── custom label for pie ── */
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
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

      {/* KPI stat cards */}
      <div className="analytics__stats">
        <StatCard icon={<LogIn size={22}/>}    value={todayEntries}          label="Today's Entries"   color="orange" />
        <StatCard icon={<LogOut size={22}/>}   value={todayExits}            label="Today's Exits"     color="orange" />
        <StatCard icon={<Warehouse size={22}/>} value={inYardVehicles.length} label="In Yard Now"      color="teal"   />
        <StatCard icon={<Truck size={22}/>}    value={vehicles.length}       label="Total Vehicles"    color="teal"   />
        <StatCard icon={<Activity size={22}/>} value={pcbs.length}           label="Total PCBs"        color="teal"   />
      </div>

      {/* Charts row 1 */}
      <div className="analytics__charts-row">
        {/* Battery distribution bar */}
        <ChartCard title="Battery Distribution" sub="PCB count by charge range" className="analytics__chart--wide">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={batteryDistData} barSize={36} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip unit=" PCBs" />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="count" name="PCBs" radius={[5, 5, 0, 0]}>
                {batteryDistData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Fleet status pie */}
        <ChartCard title="Fleet Status" sub="In-yard vs inactive">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={fleetStatusData} dataKey="value" nameKey="name"
                   cx="50%" cy="50%" outerRadius={78} labelLine={false} label={renderPieLabel}>
                {fleetStatusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* PCB status pie */}
        <ChartCard title="PCB Status" sub="Available / Assigned / Faulty">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pcbStatusData} dataKey="value" nameKey="name"
                   cx="50%" cy="50%" outerRadius={78} labelLine={false} label={renderPieLabel}>
                {pcbStatusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="analytics__charts-row analytics__charts-row--2">
        {/* 7-day vehicle timeline area */}
        <ChartCard title="7-Day Vehicle Activity" sub="Vehicles in yard, entries & exits" className="analytics__chart--wide">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timelineData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TEAL} stopOpacity={0.18}/>
                  <stop offset="95%" stopColor={TEAL} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={AMBER} stopOpacity={0.18}/>
                  <stop offset="95%" stopColor={AMBER} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="vehicles" name="In Yard" stroke={TEAL} strokeWidth={2} fill="url(#gradTeal)" dot={{ r: 3, fill: TEAL }} />
              <Area type="monotone" dataKey="entries"  name="Entries" stroke={AMBER} strokeWidth={2} fill="url(#gradAmber)" dot={{ r: 3, fill: AMBER }} strokeDasharray="5 3" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Battery health radial */}
        <ChartCard title="Battery Health" sub="Good / Moderate / Critical">
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart
              cx="50%" cy="50%"
              innerRadius="25%" outerRadius="90%"
              data={radialData}
              startAngle={90} endAngle={-270}
            >
              <RadialBar minAngle={8} dataKey="value" cornerRadius={6} label={false}>
                {radialData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </RadialBar>
              <Tooltip content={<ChartTooltip unit=" PCBs" />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* In Yard table */}
      <div className="analytics__card">
        <div className="analytics__card-header">
          <h2 className="analytics__card-title">Vehicles in Yard</h2>
          <button className="analytics__toggle-all" onClick={handleToggleAll}>Toggle All</button>
        </div>
        <div className="analytics__search">
          <Search size={14}/>
          <input placeholder="Search vehicle..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="analytics__vehicle-list">
          {filteredInYard.length === 0 && <div className="analytics__empty">No vehicles in yard</div>}
          {filteredInYard.map(v => (
            <VehicleRow key={v.vin} vehicle={v} checked={!!toggled[v.vin]} onToggle={() => handleToggle(v.vin)} />
          ))}
        </div>
      </div>

      {/* Inactive */}
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