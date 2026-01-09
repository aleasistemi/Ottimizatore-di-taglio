
import { OptimizationResult, PanelOptimizationResult } from '../types';

export const exportService = {
  toPdf: (results: OptimizationResult, cliente: string, commessa: string) => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    const margin = 15;
    doc.setFontSize(28); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.text("ALEA SISTEMI", margin, 25);
    doc.setFontSize(10); doc.setTextColor(220, 38, 38); doc.text("OTTIMIZZATORE PROFESSIONALE DI TAGLIO", margin, 31);
    doc.setDrawColor(226, 232, 240); doc.line(margin, 38, 200, 38);
    doc.setFontSize(12); doc.setTextColor(100); doc.text("CLIENTE:", margin, 48); doc.text("COMMESSA:", margin, 54);
    doc.setTextColor(40); doc.text(cliente || 'N/D', margin + 30, 48); doc.text(commessa || 'N/D', margin + 30, 54);
    
    let y = 65;
    for (const [code, data] of Object.entries(results)) {
      doc.setFillColor(15, 23, 42); doc.rect(margin, y, 180, 12, 'F');
      doc.setFontSize(14); doc.setTextColor(255); doc.text(`${code} - ${data.descrizione}`, margin + 5, y + 8);
      y += 20;
      data.barre.forEach((bar, bIdx) => {
        doc.setFontSize(11); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold");
        doc.text(`BARRA ${bIdx + 1} - Taglio: ${bar.somma}mm | Sfrido: ${bar.residuo}mm`, margin, y);
        y += 6; doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        doc.text(`Schema: ${bar.riepilogo}`, margin, y); y += 10;
        if (y > 270) { doc.addPage(); y = 20; }
      });
      y += 5;
    }
    doc.save(`ALEA_Barre_${commessa}.pdf`);
  },

  panelToPdf: (results: PanelOptimizationResult, cliente: string, commessa: string, sheetW: number, sheetH: number, colore: string, spessore: string) => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const margin = 15;
    const pageWidth = 210;
    let first = true;

    Object.values(results).forEach(group => {
      group.sheets.forEach((sheet, sIdx) => {
        if (!first) doc.addPage(); first = false;
        doc.setFontSize(24); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.text("ALEA SISTEMI", margin, 20);
        doc.setFontSize(10); doc.setTextColor(220, 38, 38); doc.text("DISTINTA TAGLIO PANNELLI", margin, 26);
        
        doc.setFontSize(11); doc.setTextColor(100);
        doc.text(`Cliente: ${cliente || '-'} | Commessa: ${commessa || '-'}`, margin, 35);
        doc.setTextColor(15, 23, 42); doc.setFontSize(13);
        doc.text(`Materiale: ${group.material} | Spessore: ${spessore}mm | Colore: ${colore || 'N/D'}`, margin, 42);
        doc.setFontSize(11); doc.text(`Dimensione Lastra: ${sheetW} x ${sheetH} mm | Foglio ${sIdx + 1}`, margin, 48);

        const scale = Math.min((pageWidth - 2 * margin) / sheetW, 150 / sheetH);
        const offsetX = (pageWidth - sheetW * scale) / 2;
        const offsetY = 60;
        doc.setDrawColor(180); doc.rect(offsetX, offsetY, sheetW * scale, sheetH * scale);

        sheet.panels.forEach(p => {
          doc.setFillColor(230, 230, 230); doc.rect(offsetX + p.x * scale, offsetY + p.y * scale, p.w * scale, p.h * scale, 'FD');
          if (p.w * scale > 15) {
            doc.setFontSize(9); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text(`${p.w}x${p.h}`, offsetX + (p.x + p.w/2)*scale, offsetY + (p.y + p.h/2)*scale, { align: 'center' });
          }
        });
        doc.setFontSize(10); doc.text(`Efficienza: ${((sheet.areaUsata / (sheetW * sheetH)) * 100).toFixed(1)}%`, margin, 280);
      });
    });
    doc.save(`ALEA_Pannelli_${commessa}.pdf`);
  },

  toCsv: (results: OptimizationResult) => {
    let csv = "Profilo;Somma;Sfrido;Riepilogo\n";
    Object.entries(results).forEach(([code, data]) => {
      data.barre.forEach(b => { csv += `${code};${b.somma};${b.residuo};"${b.riepilogo}"\n`; });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "ALEA_Export.csv"; link.click();
  }
};
