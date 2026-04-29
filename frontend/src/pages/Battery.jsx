import React, { useRef, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, Legend,
} from 'recharts';
import { BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, Zap, Download, AlertTriangle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { generateBatteryPDF } from '../services/pdfExport';
import './Battery.css';

/* ── tiny doughnut (pure canvas, no dep) ── */
function Doughnut({ segments, size = 180 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2, r = size * 0.42, inner = size * 0.27;
    const total = segments.reduce((s, g) => s + g.value, 0);
    let start = -Math.PI / 2;

    ctx.clearRect(0, 0, size, size);

    if (total === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx, cy, inner, Math.PI * 2, 0, true);
      ctx.fillStyle = 'var(--gray-200, #e5e7eb)';
      ctx.fill();
      return;
    }

    segments.forEach(({ value, color }) => {
      if (value === 0) return;
      const sweep = (value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + sweep);
      ctx.arc(cx, cy, inner, start + sweep, start, true);
      ctx.fillStyle = color;
      ctx.fill();
      start += sweep;
    });
  }, [segments, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}

/* ── custom tooltip ── */
function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bat-chart-tooltip">
      {label && <div className="bat-chart-tooltip__label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="bat-chart-tooltip__row">
          <span className="bat-chart-tooltip__dot" style={{ background: p.color || p.fill }} />
          <span className="bat-chart-tooltip__name">{p.name}:</span>
          <span className="bat-chart-tooltip__val">{p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Chart card wrapper ── */
function ChartCard({ title, sub, children }) {
  return (
    <div className="bat-chart-card">
      <div className="bat-chart-card__header">
        <div className="bat-chart-card__title">{title}</div>
        {sub && <div className="bat-chart-card__sub">{sub}</div>}
      </div>
      <div className="bat-chart-card__body">{children}</div>
    </div>
  );
}

/* ── PCB card ── */
function PCBCard({ pcb, tier, onClick }) {
  const battery = pcb.battery_level != null ? parseFloat(pcb.battery_level) : null;
  const barColor =
    tier === 'good'     ? '#14b88a' :
    tier === 'moderate' ? '#f59e0b' : '#ef4444';

  return (
    <div className={`bat-card bat-card--${tier}`} onClick={() => onClick && onClick(pcb.pcb_id)} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="bat-card__top">
        <span className="bat-card__id">PCB{pcb.pcb_id}</span>
        <span className={`bat-card__status bat-card__status--${tier}`}>
          {tier === 'good' ? 'Good' : tier === 'moderate' ? 'Moderate' : 'Critical'}
        </span>
      </div>
      <div className="bat-card__level">
        {battery !== null ? `${battery}%` : '—'}
      </div>
      <div className="bat-card__bar-wrap">
        <div
          className="bat-card__bar-fill"
          style={{ width: `${battery ?? 0}%`, background: barColor }}
        />
      </div>
      <div className="bat-card__meta">
        <span>Status: {pcb.status}</span>
      </div>
    </div>
  );
}

/* ── section ── */
function BatterySection({ tier, label, icon, pcbs, accent, onCardClick }) {
  return (
    <div className={`bat-section bat-section--${tier}`}>
      <div className="bat-section__header">
        <span className="bat-section__icon" style={{ color: accent }}>{icon}</span>
        <div>
          <div className="bat-section__label">{label}</div>
          <div className="bat-section__count">{pcbs.length} unit{pcbs.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
      {pcbs.length === 0 ? (
        <div className="bat-section__empty">No PCBs in this category</div>
      ) : (
        <div className="bat-section__grid">
          {pcbs.map(p => <PCBCard key={p.pcb_id} pcb={p} tier={tier} onClick={onCardClick} />)}
        </div>
      )}
    </div>
  );
}

export default function Battery() {
  const { pcbs, vehicles, pcbLocations, goodBatteryPcbs, moderateBatteryPcbs, criticalBatteryPcbs, unknownBatteryPcbs, setSelectVin } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');

  const filteredPcbs = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const isPcbSearch = q.startsWith('pcb');
    return pcbs.filter(p => {
      const matchPcb = isPcbSearch && `pcb${p.pcb_id}`.includes(q);
      const vehicle = vehicles.find(v => v.current_pcb_id === p.pcb_id);
      const matchVin = vehicle?.vin.toLowerCase().includes(q);
      return matchPcb || matchVin;
    });
  }, [pcbs, vehicles, search]);

  const total = pcbs.length;
  const avgBattery = pcbs.length
    ? (pcbs.reduce((s, p) => s + (parseFloat(p.battery_level) || 0), 0) / pcbs.length).toFixed(1)
    : 0;

  const doughnutSegments = [
    { value: goodBatteryPcbs.length,     color: '#14b88a' },
    { value: moderateBatteryPcbs.length, color: '#f59e0b' },
    { value: criticalBatteryPcbs.length, color: '#ef4444' },
    { value: unknownBatteryPcbs.length,  color: '#d1d5db' },
  ];

  /* ── Battery distribution bar chart data ── */
  const batteryDistData = [
    {
      range: '0–20%',
      count: pcbs.filter(p => p.battery_level != null && parseFloat(p.battery_level) <= 20).length,
      fill: '#ef4444',
    },
    {
      range: '21–40%',
      count: pcbs.filter(p => p.battery_level != null && parseFloat(p.battery_level) > 20 && parseFloat(p.battery_level) <= 40).length,
      fill: '#f59e0b',
    },
    {
      range: '41–60%',
      count: pcbs.filter(p => p.battery_level != null && parseFloat(p.battery_level) > 40 && parseFloat(p.battery_level) <= 60).length,
      fill: '#eab308',
    },
    {
      range: '61–80%',
      count: pcbs.filter(p => p.battery_level != null && parseFloat(p.battery_level) > 60 && parseFloat(p.battery_level) <= 80).length,
      fill: '#84cc16',
    },
    {
      range: '81–100%',
      count: pcbs.filter(p => p.battery_level != null && parseFloat(p.battery_level) > 80).length,
      fill: '#14b88a',
    },
  ];

  const veryCriticalPcbs = pcbs.filter(p => p.battery_level != null && parseFloat(p.battery_level) < 20);

  // Alert when battery is less than 20%
  useEffect(() => {
    if (veryCriticalPcbs.length > 0) {
      const pcbIds = veryCriticalPcbs.map(p => p.pcb_id).join(', ');
      alert(`⚠️ CRITICAL BATTERY ALERT!\n\nThe following PCBs have battery levels below 20%:\nPCB IDs: ${pcbIds}\n\nPlease recharge immediately.`);
    }
  }, [veryCriticalPcbs.length]);

  function handleDownloadPDF() {
    generateBatteryPDF({ pcbs, goodBatteryPcbs, moderateBatteryPcbs, criticalBatteryPcbs, unknownBatteryPcbs, avgBattery, vehicles });
  }

  const handleCardClick = (pcbId) => {
    const vehicle = vehicles.find(v => v.current_pcb_id === pcbId);
    if (vehicle) {
      setSelectVin(vehicle.vin);
      navigate('/');
    } else {
      alert("This PCB is not currently assigned to any vehicle.");
    }
  };

  return (
    <div className="battery-page">
      {/* Header */}
      <div className="battery-page__header">
        <div>
          <h1 className="battery-page__title">Battery Management</h1>
          <p className="battery-page__sub">Real-time PCB power status across the fleet</p>
        </div>
        <button className="battery-page__pdf-btn" onClick={handleDownloadPDF}>
          <Download size={15}/>
          Battery Report
        </button>
      </div>

      {/* Overview row: doughnut + summary stats */}
      <div className="battery-page__overview">
        <div className="bat-donut-card">
          <div className="bat-donut-card__canvas-wrap">
            <Doughnut segments={doughnutSegments} size={180} />
            <div className="bat-donut-card__center">
              <span className="bat-donut-card__total">{total}</span>
              <span className="bat-donut-card__total-label">PCBs</span>
            </div>
          </div>
          <div className="bat-donut-card__legend">
            <LegendItem color="#14b88a" label="Good (≥80%)"       value={goodBatteryPcbs.length} />
            <LegendItem color="#f59e0b" label="Moderate (30–79%)" value={moderateBatteryPcbs.length} />
            <LegendItem color="#ef4444" label="Critical (<30%)"   value={criticalBatteryPcbs.length} />
            <LegendItem color="#d1d5db" label="Unknown"           value={unknownBatteryPcbs.length} />
          </div>
        </div>

        <div className="bat-summary-grid">
          <SummaryCard color="#14b88a" value={goodBatteryPcbs.length}     label="Good"     sub="≥ 80% battery"  icon={<BatteryFull size={20}/>} />
          <SummaryCard color="#f59e0b" value={moderateBatteryPcbs.length} label="Moderate" sub="30% – 79%"      icon={<BatteryMedium size={20}/>} />
          <SummaryCard color="#ef4444" value={criticalBatteryPcbs.length} label="Critical" sub="< 30% battery"  icon={<BatteryLow size={20}/>} />
          <SummaryCard color="var(--teal-500)" value={`${avgBattery}%`}  label="Fleet Avg" sub="average battery" icon={<Zap size={20}/>} />
        </div>
      </div>

      {/* Charts row: Battery distribution bar + Battery health radial */}
      <div className="bat-charts-row">
        <ChartCard title="Battery Distribution" sub="PCB count by charge range">
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

        <ChartCard title="Critical Level Units" sub="PCBs requiring immediate attention">
          <div style={{ height: '200px', overflowY: 'auto', padding: '10px 0' }}>
            {criticalBatteryPcbs.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <BatteryFull size={32} color="#14b88a" style={{ marginBottom: '8px' }} />
                <span>No critical batteries!</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {criticalBatteryPcbs.map(p => {
                  const battery = parseFloat(p.battery_level);
                  const isVeryLow = battery < 20;
                  return (
                    <div key={p.pcb_id} onClick={() => handleCardClick(p.pcb_id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: isVeryLow ? '#fef2f2' : '#fffbeb', border: `1px solid ${isVeryLow ? '#fecaca' : '#fef3c7'}`, borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertTriangle size={18} color={isVeryLow ? '#ef4444' : '#f59e0b'} />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>PCB{p.pcb_id}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: isVeryLow ? '#ef4444' : '#f59e0b', fontSize: '15px' }}>{battery}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Critical alert banner */}
      {criticalBatteryPcbs.length > 0 && (
        <div className="bat-alert">
          <BatteryLow size={16}/>
          <strong>{criticalBatteryPcbs.length} PCB{criticalBatteryPcbs.length > 1 ? 's' : ''} critically low</strong>
          — immediate attention required. Units: {criticalBatteryPcbs.map(p => `PCB${p.pcb_id}`).join(', ')}
        </div>
      )}

      {/* Search Feature */}
      <div className="analytics__card" style={{ marginBottom: '24px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div className="analytics__search" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderBottom: search.trim() ? '1px solid var(--border)' : 'none' }}>
          <Search size={14} color="var(--text-muted)" />
          <input 
            placeholder="Search battery details by VIN or PCB ID..." 
            value={search}
            onChange={e => setSearch(e.target.value)} 
            style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', color: 'var(--text-primary)', fontSize: '13px' }} 
          />
        </div>
        {search.trim() && (
          <div className="analytics__vehicle-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {filteredPcbs.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No units found</div>
            )}
            {filteredPcbs.map(p => {
              const vehicle = vehicles.find(v => v.current_pcb_id === p.pcb_id);
              const loc = pcbLocations[p.pcb_id];
              return <BatteryRow key={p.pcb_id} pcb={p} vehicle={vehicle} loc={loc} onClick={() => handleCardClick(p.pcb_id)} />;
            })}
          </div>
        )}
      </div>

      {/* Sections */}
      <BatterySection tier="good"     label="Good Battery"     icon={<BatteryFull size={18}/>}   pcbs={goodBatteryPcbs}     accent="#14b88a" onCardClick={handleCardClick} />
      <BatterySection tier="moderate" label="Moderate Battery" icon={<BatteryMedium size={18}/>} pcbs={moderateBatteryPcbs} accent="#f59e0b" onCardClick={handleCardClick} />
    </div>
  );
}

function LegendItem({ color, label, value }) {
  return (
    <div className="bat-legend-item">
      <span className="bat-legend-dot" style={{ background: color }} />
      <span className="bat-legend-label">{label}</span>
      <span className="bat-legend-val">{value}</span>
    </div>
  );
}

function SummaryCard({ color, value, label, sub, icon }) {
  return (
    <div className="bat-summary-card">
      <div className="bat-summary-card__icon" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div className="bat-summary-card__value" style={{ color }}>{value}</div>
      <div className="bat-summary-card__label">{label}</div>
      <div className="bat-summary-card__sub">{sub}</div>
    </div>
  );
}

function BatteryRow({ pcb, vehicle, loc, onClick }) {
  const battery = pcb.battery_level != null ? parseFloat(pcb.battery_level) : null;
  const updatedStr = loc?.updated ? new Date(loc.updated).toLocaleString() : '—';
  
  const tier = battery == null ? 'Unknown' : battery >= 80 ? 'Good' : battery >= 30 ? 'Moderate' : 'Critical';
  const tierColor = battery == null ? '#9ca3af' : battery >= 80 ? '#14b88a' : battery >= 30 ? '#f59e0b' : '#ef4444';

  return (
    <div className="veh-row" onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.12s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
      <div style={{ flex: '1', minWidth: '80px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{vehicle ? vehicle.vin : 'Unassigned'}</span>
      </div>
      <div style={{ flex: '2', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
        {loc ? (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No GPS data</span>
        )}
      </div>
      <div style={{ flex: '1', minWidth: '100px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>PCB{pcb.pcb_id}</span>
      </div>
      <div style={{ flex: '1.5', minWidth: '120px', display: 'flex', alignItems: 'center', color: tierColor, fontWeight: 600, fontSize: '13px' }}>
        {tier} ({battery != null ? `${battery.toFixed(0)}%` : '—'})
      </div>
      <div style={{ flex: '1', minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{updatedStr}</span>
      </div>
    </div>
  );
}