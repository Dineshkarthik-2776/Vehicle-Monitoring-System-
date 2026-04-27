import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateAnalyticsPDF({ inYardVehicles, inactiveVehicles, todayEntries, todayExits }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const teal = [20, 184, 138];
  const gray = [107, 114, 128];
  const dark = [17, 24, 39];

  // Header bar
  doc.setFillColor(...teal);
  doc.rect(0, 0, 210, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('AL Tracker — Fleet Analytics Report', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleString(), 196, 14, { align: 'right' });

  let y = 32;

  // Summary row
  doc.setTextColor(...dark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, y);
  y += 6;

  const summaryData = [
    ["Today's Entries", String(todayEntries)],
    ["Today's Exits", String(todayExits)],
    ['In Yard Now', String(inYardVehicles.length)],
    ['Assigned but Inactive', String(inactiveVehicles.length)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: teal, textColor: 255, fontStyle: 'bold', fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 1: { fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 10;

  // In Yard table
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

  // Inactive table
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

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(`AL Tracker — Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
  }

  doc.save(`al-tracker-report-${Date.now()}.pdf`);
}
