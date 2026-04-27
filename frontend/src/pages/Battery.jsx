import React, { useRef, useEffect, useState } from 'react';
import { BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, Zap, Download } from 'lucide-react';
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

/* ── PCB card ── */
function PCBCard({ pcb, tier }) {
  const battery = pcb.battery_level != null ? parseFloat(pcb.battery_level) : null;

  const barColor =
    tier === 'good'     ? '#14b88a' :
    tier === 'moderate' ? '#f59e0b' : '#ef4444';

  return (
    <div className={`bat-card bat-card--${tier}`}>
      <div className="bat-card__top">
        <span className="bat-card__id">PCB {pcb.pcb_id}</span>
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
function BatterySection({ tier, label, icon, pcbs, accent }) {
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
          {pcbs.map(p => <PCBCard key={p.pcb_id} pcb={p} tier={tier} />)}
        </div>
      )}
    </div>
  );
}

export default function Battery() {
  const { pcbs, goodBatteryPcbs, moderateBatteryPcbs, criticalBatteryPcbs, unknownBatteryPcbs } = useApp();

  const total = pcbs.length;
  const avgBattery = pcbs.length
    ? (pcbs.reduce((s, p) => s + (parseFloat(p.battery_level) || 0), 0) / pcbs.length).toFixed(1)
    : 0;

  const segments = [
    { value: goodBatteryPcbs.length,     color: '#14b88a' },
    { value: moderateBatteryPcbs.length, color: '#f59e0b' },
    { value: criticalBatteryPcbs.length, color: '#ef4444' },
    { value: unknownBatteryPcbs.length,  color: '#d1d5db' },
  ];

  function handleDownloadPDF() {
    generateBatteryPDF({ pcbs, goodBatteryPcbs, moderateBatteryPcbs, criticalBatteryPcbs, unknownBatteryPcbs, avgBattery });
  }

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
          Download PDF
        </button>
      </div>

      {/* Overview row */}
      <div className="battery-page__overview">
        {/* Doughnut */}
        <div className="bat-donut-card">
          <div className="bat-donut-card__chart">
            <div className="bat-donut-card__canvas-wrap">
              <Doughnut segments={segments} size={180} />
              <div className="bat-donut-card__center">
                <span className="bat-donut-card__total">{total}</span>
                <span className="bat-donut-card__total-label">PCBs</span>
              </div>
            </div>
          </div>
          <div className="bat-donut-card__legend">
            <LegendItem color="#14b88a" label="Good (≥80%)"     value={goodBatteryPcbs.length} />
            <LegendItem color="#f59e0b" label="Moderate (30–79%)" value={moderateBatteryPcbs.length} />
            <LegendItem color="#ef4444" label="Critical (<30%)"  value={criticalBatteryPcbs.length} />
            <LegendItem color="#d1d5db" label="Unknown"          value={unknownBatteryPcbs.length} />
          </div>
        </div>

        {/* Summary stats */}
        <div className="bat-summary-grid">
          <SummaryCard
            color="#14b88a"
            value={goodBatteryPcbs.length}
            label="Good"
            sub="≥ 80% battery"
            icon={<BatteryFull size={20}/>}
          />
          <SummaryCard
            color="#f59e0b"
            value={moderateBatteryPcbs.length}
            label="Moderate"
            sub="30% – 79%"
            icon={<BatteryMedium size={20}/>}
          />
          <SummaryCard
            color="#ef4444"
            value={criticalBatteryPcbs.length}
            label="Critical"
            sub="< 30% battery"
            icon={<BatteryLow size={20}/>}
          />
          <SummaryCard
            color="var(--teal-500)"
            value={`${avgBattery}%`}
            label="Fleet Avg"
            sub="average battery"
            icon={<Zap size={20}/>}
          />
        </div>
      </div>

      {/* Critical alert banner */}
      {criticalBatteryPcbs.length > 0 && (
        <div className="bat-alert">
          <BatteryLow size={16}/>
          <strong>{criticalBatteryPcbs.length} PCB{criticalBatteryPcbs.length > 1 ? 's' : ''} critically low</strong>
          — immediate attention required. Units: {criticalBatteryPcbs.map(p => `PCB ${p.pcb_id}`).join(', ')}
        </div>
      )}

      {/* Three sections */}
      <BatterySection
        tier="good"
        label="Good Battery"
        icon={<BatteryFull size={18}/>}
        pcbs={goodBatteryPcbs}
        accent="#14b88a"
      />
      <BatterySection
        tier="moderate"
        label="Moderate Battery"
        icon={<BatteryMedium size={18}/>}
        pcbs={moderateBatteryPcbs}
        accent="#f59e0b"
      />
      <BatterySection
        tier="critical"
        label="Critical Battery"
        icon={<BatteryLow size={18}/>}
        pcbs={criticalBatteryPcbs}
        accent="#ef4444"
      />
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