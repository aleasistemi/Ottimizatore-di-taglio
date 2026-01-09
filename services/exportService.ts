
import { OptimizationResult, PanelOptimizationResult, OptimizedBar, GroupedBarResult } from '../types';

const getGroupedBars = (barre: OptimizedBar[]): GroupedBarResult[] => {
  const groups: Record<string, GroupedBarResult> = {};
  barre.forEach(bar => {
    const fingerprint = bar.tagli.map(t => `${t.lung}-${t.angoli}`).join('|');
    if (groups[fingerprint]) groups[fingerprint].count++;
    else groups[fingerprint] = { ...bar, count: 1 };
  });
  return Object.values(groups);
};

export const exportService = {
  toPdf: (results: OptimizationResult, cliente: string, commessa: string, groupBars: boolean = false) => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    const margin = 15;
    doc.setFontSize(28); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.text("ALEA SISTEMI", margin, 25);
    doc.setFontSize(10); doc.setTextColor(220, 38, 38); doc.text("OTTIMIZZATORE PROFESSIONALE DI TAGLIO", margin, 31);
    doc.setDrawColor(226, 232, 240); doc.line(margin, 38, 200, 38);
    
    doc.setFontSize(12); doc.setTextColor(100);
    doc.text(`CLIENTE: ${cliente || 'N/D'}`, margin, 48);
    doc.text(`COMMESSA: ${commessa || 'N/D'}`, margin, 54);
    
    let y = 65;
    for (const [code, data] of Object.entries(results)) {
      doc.setFillColor(15, 23, 42); doc.rect(margin, y, 180, 12, 'F');
      doc.setFontSize(14); doc.setTextColor(255); doc.text(`${code} - ${data.descrizione}`, margin + 5, y + 8);
      y += 20;
      
      const barreToPrint = groupBars ? getGroupedBars(data.barre) : data.barre.map(b => ({ ...b, count: 1 }));
      barreToPrint.forEach((bar, bIdx) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(11); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold");
        const label = bar.count > 1 ? `${bar.count}x BARRE IDENTICHE` : `BARRA ${bIdx + 1}`;
        doc.text(`${label} - Taglio: ${bar.somma}mm | Sfrido: ${bar.residuo}mm`, margin, y);
        y += 6; doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        doc.text(`Schema: ${bar.riepilogo}`, margin, y); y += 12;
      });
      y += 5;
    }
    doc.save(`ALEA_Barre_${commessa || 'Export'}.pdf`);
  },

  panelToPdf: (results: PanelOptimizationResult, cliente: string, commessa: string, sheetW: number, sheetH: number, colore: string) => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const margin = 15;
    const pageWidth = 210;
    let first = true;

    Object.values(results).forEach(group => {
      group.sheets.forEach((sheet, sIdx) => {
        if (!first) doc.addPage(); first = false;
        doc.setFontSize(26); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.text("ALEA SISTEMI", margin, 20);
        doc.setFontSize(10); doc.setTextColor(220, 38, 38); doc.text("DISTINTA TAGLIO PANNELLI", margin, 26);
        
        doc.setFontSize(12); doc.setTextColor(100);
        doc.text(`Cliente: ${cliente || '-'} | Commessa: ${commessa || '-'}`, margin, 35);
        doc.setTextColor(15, 23, 42); doc.setFontSize(13);
        doc.text(`Materiale: ${group.material} | Colore: ${colore || 'N/D'}`, margin, 44);
        doc.setFontSize(11); doc.text(`Lastra Grezza: ${sheetW} x ${sheetH} mm | Foglio ${sIdx + 1}`, margin, 50);

        const scale = Math.min((pageWidth - 2 * margin) / sheetW, 140 / sheetH);
        const offsetX = (pageWidth - sheetW * scale) / 2;
        const offsetY = 65;
        doc.setDrawColor(0); doc.setLineWidth(0.5);
        doc.rect(offsetX, offsetY, sheetW * scale, sheetH * scale);

        sheet.panels.forEach(p => {
          doc.setFillColor(245, 245, 245);
          doc.rect(offsetX + p.x * scale, offsetY + p.y * scale, p.w * scale, p.h * scale, 'FD');
          if (p.w * scale > 15) {
            doc.setFontSize(8); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text(`${p.w}x${p.h}`, offsetX + (p.x + p.w/2)*scale, offsetY + (p.y + p.h/2)*scale, { align: 'center' });
          }
        });
        
        doc.setFontSize(10); doc.setTextColor(100);
        doc.text(`Residuo Area: ${sheet.residuo.toLocaleString()} mm2`, margin, 280);
      });
    });
    doc.save(`ALEA_Nesting_${commessa || 'Pannelli'}.pdf`);
  },

  toCsv: (results: OptimizationResult, groupBars: boolean = false) => {
    let csv = "Profilo;Quantità;Somma;Sfrido;Riepilogo\n";
    Object.entries(results).forEach(([code, data]) => {
      const barreToPrint = groupBars ? getGroupedBars(data.barre) : data.barre.map(b => ({ ...b, count: 1 }));
      barreToPrint.forEach(b => { 
        csv += `${code};${b.count};${b.somma};${b.residuo};"${b.riepilogo}"\n`; 
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "ALEA_Export_Barre.csv"; link.click();
  },

  panelsToCsv: (results: PanelOptimizationResult) => {
    let csv = "Materiale;Larghezza;Altezza;Rotazione\n";
    Object.values(results).forEach(g => {
      g.sheets.forEach(s => {
        s.panels.forEach(p => { csv += `${p.material};${p.w};${p.h};${p.rotated}\n`; });
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "ALEA_Export_Pannelli.csv"; link.click();
  }
};
