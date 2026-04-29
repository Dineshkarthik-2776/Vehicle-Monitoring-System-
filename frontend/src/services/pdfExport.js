import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ── shared helpers ── */
function drawHeader(doc, title) {
  const teal = [20, 184, 138];
  doc.setFillColor(...teal);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleString(), 196, 14, { align: 'right' });
}

function drawFooter(doc) {
  const gray = [107, 114, 128];
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(`AL Tracker — Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
  }
}

/* ── Analytics PDF ── */
export function generateAnalyticsPDF({ inYardVehicles, inactiveVehicles, todayEntries, todayExits }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const teal = [20, 184, 138];
  const gray = [107, 114, 128];
  const dark = [17, 24, 39];

  drawHeader(doc, 'AL Tracker — Fleet Analytics Report');

  let y = 32;

  doc.setTextColor(...dark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ["Today's Entries",       String(todayEntries)],
      ["Today's Exits",         String(todayExits)],
      ['In Yard Now',           String(inYardVehicles.length)],
      ['Assigned but Inactive', String(inactiveVehicles.length)],
    ],
    theme: 'grid',
    headStyles: { fillColor: teal, textColor: 255, fontStyle: 'bold', fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 1: { fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...dark);
  doc.text('Vehicles In Yard', 14, y);
  y += 4;

  if (inYardVehicles.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gray);
    doc.setFontSize(10);
    doc.text('No vehicles currently in yard.', 14, y + 6);
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      head: [['VIN', 'PCB', 'Latitude', 'Longitude', 'Battery', 'Last Updated']],
      body: inYardVehicles.map(v => [
        v.vin,
        `PCB${v.current_pcb_id}`,
        v.location?.lat?.toFixed(5) ?? '—',
        v.location?.lng?.toFixed(5) ?? '—',
        v.battery_level != null ? `${v.battery_level}%` : '—',
        v.location?.updated ? new Date(v.location.updated).toLocaleString() : '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: teal, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (inactiveVehicles.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...dark);
    doc.text('Assigned but Not Active', 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['VIN', 'PCB', 'Assigned At']],
      body: inactiveVehicles.map(v => [
        v.vin,
        `PCB${v.current_pcb_id}`,
        v.assigned_at ? new Date(v.assigned_at).toLocaleString() : '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
  }

  drawFooter(doc);
  const timestamp = new Date().toLocaleString('en-IN').replace(/[/,:]/g, '-').replace(/\s/g, '_');
  doc.save(`al-tracker-analytics-${timestamp}.pdf`);
}

/* ── Battery PDF ── */
export function generateBatteryPDF({
  pcbs,
  goodBatteryPcbs,
  moderateBatteryPcbs,
  criticalBatteryPcbs,
  unknownBatteryPcbs,
  avgBattery,
  vehicles,
}) {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const teal  = [20, 184, 138];
  const amber = [245, 158, 11];
  const red   = [239, 68, 68];
  const gray  = [107, 114, 128];
  const dark  = [17, 24, 39];

  drawHeader(doc, 'AL Tracker — Battery Management Report');

  let y = 32;

  /* Summary */
  doc.setTextColor(...dark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Fleet Battery Summary', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Total PCBs',         String(pcbs.length)],
      ['Fleet Average',      `${avgBattery}%`],
      ['Good (>=80%)',      String(goodBatteryPcbs.length)],
      ['Moderate (30-79%)',  String(moderateBatteryPcbs.length)],
      ['Critical  (<30%)', String(criticalBatteryPcbs.length)],
      ['Unknown',            String(unknownBatteryPcbs.length)],
    ],
    theme: 'grid',
    headStyles: { fillColor: teal, textColor: 255, fontStyle: 'bold', fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 1: { fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 10;

  /* Critical */
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...red);
  doc.text(`Critical Battery  —  ${criticalBatteryPcbs.length} unit(s)`, 14, y);
  y += 4;

  if (criticalBatteryPcbs.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gray);
    doc.setFontSize(10);
    doc.text('No critical PCBs.', 14, y + 6);
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      head: [['PCB ID', 'Battery', 'Status', 'Latitude', 'Longitude']],
      body: criticalBatteryPcbs.map(p => {
        const veh = vehicles?.find(v => v.current_pcb_id === p.pcb_id);
        const lat = veh?.location?.lat != null ? veh.location.lat.toFixed(5) : '—';
        const lng = veh?.location?.lng != null ? veh.location.lng.toFixed(5) : '—';
        return [
          `PCB ${p.pcb_id}`,
          p.battery_level != null ? `${parseFloat(p.battery_level).toFixed(1)}%` : '—',
          p.status,
          lat,
          lng
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: red, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  /* Moderate */
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...amber);
  doc.text(`Moderate Battery  —  ${moderateBatteryPcbs.length} unit(s)`, 14, y);
  y += 4;

  if (moderateBatteryPcbs.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gray);
    doc.setFontSize(10);
    doc.text('No moderate PCBs.', 14, y + 6);
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      head: [['PCB ID', 'Battery', 'Status', 'Latitude', 'Longitude']],
      body: moderateBatteryPcbs.map(p => {
        const veh = vehicles?.find(v => v.current_pcb_id === p.pcb_id);
        const lat = veh?.location?.lat != null ? veh.location.lat.toFixed(5) : '—';
        const lng = veh?.location?.lng != null ? veh.location.lng.toFixed(5) : '—';
        return [
          `PCB ${p.pcb_id}`,
          p.battery_level != null ? `${parseFloat(p.battery_level).toFixed(1)}%` : '—',
          p.status,
          lat,
          lng
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: amber, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  /* Good */
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...teal);
  doc.text(`Good Battery  —  ${goodBatteryPcbs.length} unit(s)`, 14, y);
  y += 4;

  if (goodBatteryPcbs.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gray);
    doc.setFontSize(10);
    doc.text('No PCBs with good battery.', 14, y + 6);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['PCB ID', 'Battery', 'Status', 'Latitude', 'Longitude']],
      body: goodBatteryPcbs.map(p => {
        const veh = vehicles?.find(v => v.current_pcb_id === p.pcb_id);
        const lat = veh?.location?.lat != null ? veh.location.lat.toFixed(5) : '—';
        const lng = veh?.location?.lng != null ? veh.location.lng.toFixed(5) : '—';
        return [
          `PCB ${p.pcb_id}`,
          p.battery_level != null ? `${parseFloat(p.battery_level).toFixed(1)}%` : '—',
          p.status,
          lat,
          lng
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: teal, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
  }

  drawFooter(doc);
  const timestamp = new Date().toLocaleString('en-IN').replace(/[/,:]/g, '-').replace(/\s/g, '_');
  doc.save(`al-tracker-battery-${timestamp}.pdf`);
}

/* ── Past Report (History) PDF ── */
export function generatePastReportPDF({ history }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const teal = [20, 184, 138];
  const gray = [107, 114, 128];
  const dark = [17, 24, 39];

  drawHeader(doc, 'AL Tracker — Vehicle History Report');

  let y = 32;

  doc.setTextColor(...dark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Full Vehicle Ledger  —  ${history.length} record(s)`, 14, y);
  y += 4;

  if (!history || history.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gray);
    doc.setFontSize(10);
    doc.text('No historical data found in the system.', 14, y + 6);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['VIN', 'Status', 'Assigned At', 'Detached At']],
      body: history.map(h => {
        const isCurrent = h.detached_at == null;
        return [
          h.vin,
          isCurrent ? 'ACTIVE' : 'DETACHED',
          h.assigned_at ? new Date(h.assigned_at).toLocaleString() : '—',
          h.detached_at ? new Date(h.detached_at).toLocaleString() : '—',
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: teal, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
  }

  drawFooter(doc);
  const timestamp = new Date().toLocaleString('en-IN').replace(/[/,:]/g, '-').replace(/\s/g, '_');
  doc.save(`al-tracker-history-${timestamp}.pdf`);
}

/* ── Staged Vehicles PDF ── */
export function generateStagedReportPDF({ stagedVehicles1, stagedVehicles2 }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const amber = [245, 158, 11];
  const brown = [120, 53, 15];
  const gray = [107, 114, 128];
  const dark = [17, 24, 39];

  drawHeader(doc, 'AL Tracker — Staged Vehicles Report');

  let y = 32;

  doc.setTextColor(...dark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const total = stagedVehicles1.length + stagedVehicles2.length;
  doc.text(`Total Staged Vehicles  —  ${total} unit(s)`, 14, y);
  y += 4;

  if (total === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gray);
    doc.setFontSize(10);
    doc.text('No staged vehicles found in the yard.', 14, y + 6);
    y += 14;
  } else {
    if (stagedVehicles2.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...brown);
      doc.text(`Stage 2 (>30 Days)  —  ${stagedVehicles2.length} unit(s)`, 14, y + 6);
      y += 10;
      
      autoTable(doc, {
        startY: y,
        head: [['VIN', 'PCB', 'Days Staged', 'Last Moved/Assigned']],
        body: stagedVehicles2.map(v => [
          v.vin,
          `PCB${v.current_pcb_id}`,
          `${Math.floor(v.stageDays)} days`,
          v.last_movement_at ? new Date(v.last_movement_at).toLocaleString() : (v.assigned_at ? new Date(v.assigned_at).toLocaleString() : '—')
        ]),
        theme: 'striped',
        headStyles: { fillColor: brown, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    if (stagedVehicles1.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...amber);
      doc.text(`Stage 1 (10-30 Days)  —  ${stagedVehicles1.length} unit(s)`, 14, y);
      y += 4;
      
      autoTable(doc, {
        startY: y,
        head: [['VIN', 'PCB', 'Days Staged', 'Last Moved/Assigned']],
        body: stagedVehicles1.map(v => [
          v.vin,
          `PCB${v.current_pcb_id}`,
          `${Math.floor(v.stageDays)} days`,
          v.last_movement_at ? new Date(v.last_movement_at).toLocaleString() : (v.assigned_at ? new Date(v.assigned_at).toLocaleString() : '—')
        ]),
        theme: 'striped',
        headStyles: { fillColor: amber, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }
  }

  drawFooter(doc);
  const timestamp = new Date().toLocaleString('en-IN').replace(/[/,:]/g, '-').replace(/\s/g, '_');
  doc.save(`al-tracker-staged-${timestamp}.pdf`);
}