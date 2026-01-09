
import { OptimizationResult, PanelOptimizationResult, GroupedBarResult, OptimizedBar } from '../types';

export const exportService = {
  // Fix: Implemented missing toCsv method
  toCsv: (results: OptimizationResult, grouped: boolean = true) => {
    let csv = "\ufeffProfilo;Descrizione;Barra;Somma Tagli;Sfrido;Riepilogo\n";
    for (const [code, data] of Object.entries(results)) {
      data.barre.forEach((bar, idx) => {
        csv += `${code};${data.descrizione};${idx + 1};${bar.somma};${bar.residuo};"${bar.riepilogo}"\n`;
      });
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ALEA_Ottimizzazione_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  toPdf: (results: OptimizationResult, cliente: string, commessa: string, grouped: boolean = true) => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    const margin = 15;
    doc.setFontSize(28); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.text("ALEA SISTEMI", margin, 25);
    doc.setFontSize(10); doc.setTextColor(220, 38, 38); doc.setFont("helvetica", "bold"); doc.text("OTTIMIZZATORE PROFESSIONALE DI TAGLIO", margin, 31, { charSpace: 2 });
    doc.setDrawColor(226, 232, 240); doc.line(margin, 38, 200, 38);
    doc.setFontSize(10); doc.setTextColor(100); doc.setFont("helvetica", "bold"); doc.text("CLIENTE:", margin, 48); doc.text("COMMESSA:", margin, 54); doc.text("DATA:", 150, 48);
    doc.setTextColor(40); doc.setFont("helvetica", "normal"); doc.text(cliente || 'N/D', margin + 25, 48); doc.text(commessa || 'N/D', margin + 25, 54); doc.text(new Date().toLocaleDateString('it-IT'), 165, 48);
    let y = 65;
    for (const [code, data] of Object.entries(results)) {
      doc.setFillColor(15, 23, 42); doc.rect(margin, y, 180, 10, 'F');
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(255); doc.text(`${code} - ${data.descrizione.toUpperCase()}`, margin + 5, y + 7);
      y += 20;
      doc.setTextColor(15, 23, 42); doc.setFontSize(10); doc.text(`Totale: ${data.barre.length} barre prelevate`, margin, y);
      y += 15;
    }
    doc.save(`ALEA_Distinta_Barre.pdf`);
  },

  panelToPdf: (results: PanelOptimizationResult, cliente: string, commessa: string, sheetW: number, sheetH: number, colore: string = '', spessore: string = '') => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const margin = 15;
    const pageWidth = 210;
    const pageHeight = 297;
    let first = true;

    Object.values(results).forEach(group => {
      group.sheets.forEach((sheet, sIdx) => {
        if (!first) doc.addPage(); first = false;
        doc.setFontSize(22); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.text("ALEA SISTEMI", margin, 20);
        doc.setFontSize(9); doc.setTextColor(220, 38, 38); doc.text("DISTINTA TAGLIO PANNELLI", margin, 25);
        
        doc.setFontSize(8); doc.setTextColor(100); doc.setFont("helvetica", "bold");
        doc.text(`Cliente: ${cliente || '-'} | Commessa: ${commessa || '-'}`, margin, 32);
        doc.setTextColor(15, 23, 42);
        doc.text(`Materiale: ${group.material} | Spessore: ${spessore || group.spessore}mm | Colore: ${colore || 'N/D'}`, margin, 37);
        doc.text(`Lastra: ${sheetW} x ${sheetH} mm | Foglio ${sIdx + 1}`, margin, 42);

        const scale = Math.min((pageWidth - 2 * margin) / sheetW, (pageHeight - 110) / sheetH);
        const offsetX = (pageWidth - sheetW * scale) / 2;
        const offsetY = 55;
        doc.setDrawColor(180); doc.rect(offsetX, offsetY, sheetW * scale, sheetH * scale);

        sheet.panels.forEach(p => {
          doc.setFillColor(230, 230, 230);
          doc.rect(offsetX + p.x * scale, offsetY + p.y * scale, p.w * scale, p.h * scale, 'FD');
          if (p.w * scale > 10) {
            doc.setFontSize(6); doc.setTextColor(0);
            doc.text(`${p.w}x${p.h}`, offsetX + (p.x + p.w/2)*scale, offsetY + (p.y + p.h/2)*scale, { align: 'center' });
          }
        });
        doc.setFontSize(8); doc.text(`Efficienza Foglio: ${((sheet.areaUsata / (sheetW * sheetH)) * 100).toFixed(1)}%`, margin, pageHeight - 15);
      });
    });
    doc.save(`ALEA_Nesting_Pannelli.pdf`);
  }
};
