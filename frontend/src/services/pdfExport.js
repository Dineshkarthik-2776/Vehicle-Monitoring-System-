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
  doc.save(`al-tracker-analytics-${Date.now()}.pdf`);
}

/* ── Battery PDF ── */
export function generateBatteryPDF({
  pcbs,
  goodBatteryPcbs,
  moderateBatteryPcbs,
  criticalBatteryPcbs,
  unknownBatteryPcbs,
  avgBattery,
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
      head: [['PCB ID', 'Battery Level', 'Status']],
      body: criticalBatteryPcbs.map(p => [
        `PCB ${p.pcb_id}`,
        p.battery_level != null ? `${parseFloat(p.battery_level).toFixed(1)}%` : '—',
        p.status,
      ]),
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
      head: [['PCB ID', 'Battery Level', 'Status']],
      body: moderateBatteryPcbs.map(p => [
        `PCB ${p.pcb_id}`,
        p.battery_level != null ? `${parseFloat(p.battery_level).toFixed(1)}%` : '—',
        p.status,
      ]),
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
      head: [['PCB ID', 'Battery Level', 'Status']],
      body: goodBatteryPcbs.map(p => [
        `PCB ${p.pcb_id}`,
        p.battery_level != null ? `${parseFloat(p.battery_level).toFixed(1)}%` : '—',
        p.status,
      ]),
      theme: 'striped',
      headStyles: { fillColor: teal, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
  }

  drawFooter(doc);
  doc.save(`al-tracker-battery-${Date.now()}.pdf`);
}