
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
  toPdf: (results: OptimizationResult, cliente: string, commessa: string, groupBars: boolean = true) => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = 210;
    
    doc.setFontSize(22); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.text("ALEA SISTEMI", margin, 20);
    doc.setFontSize(9); doc.setTextColor(220, 38, 38); doc.text("DISTINTA TECNICA DI TAGLIO", margin, 25);
    doc.setDrawColor(226, 232, 240); doc.line(margin, 28, pageWidth - margin, 28);
    
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`CLIENTE: ${cliente || 'N/D'}`, margin, 35);
    doc.text(`COMMESSA: ${commessa || 'N/D'}`, margin + 100, 35);
    
    let y = 45;
    for (const [code, data] of Object.entries(results)) {
      if (y > 270) { doc.addPage(); y = 20; }
      
      const totalBars = data.barre.length;
      doc.setFontSize(11); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold");
      const profileHeader = `${totalBars}x  ${code} - ${data.descrizione}`;
      doc.text(profileHeader, margin, y);
      y += 2;
      doc.setDrawColor(200); doc.line(margin, y, pageWidth - margin, y);
      y += 6;
      
      const barreToPrint = groupBars 
        ? getGroupedBars(data.barre) 
        : data.barre.map(b => ({ ...b, count: 1 }));
      
      barreToPrint.forEach((bar) => {
        if (y > 275) { doc.addPage(); y = 20; }
        
        doc.setFontSize(9); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold");
        
        const pezziList = bar.tagli.map(t => 
          `${t.lung}${t.angoli !== "90/90" ? `(${t.angoli})` : ""}`
        ).join("    ");
        
        const rowPrefix = `${bar.count}x  |  `;
        const rowSuffix = `  |  Sfrido: ${bar.residuo}mm`;
        
        const availableWidthForPezzi = 120; 
        const lines = doc.splitTextToSize(pezziList, availableWidthForPezzi);
        
        doc.text(rowPrefix, margin, y);
        
        doc.setFont("helvetica", "normal");
        lines.forEach((line: string, index: number) => {
          if (index > 0) {
            y += 4;
            if (y > 285) { doc.addPage(); y = 20; }
          }
          doc.text(line, margin + 15, y);
        });
        
        doc.setFont("helvetica", "bold");
        doc.text(rowSuffix, pageWidth - margin, y, { align: 'right' });
        
        y += 7;
      });
      y += 4;
    }
    
    doc.save(`ALEA_Taglio_${commessa || 'Barre'}.pdf`);
  },

  panelToPdf: (results: PanelOptimizationResult, cliente: string, commessa: string, sheetW: number, sheetH: number) => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const margin = 15;
    const pageWidth = 210;
    let first = true;

    Object.values(results).forEach(group => {
      const groupCode = group.codice || 'LIBERO';
      group.sheets.forEach((sheet, sIdx) => {
        if (!first) doc.addPage(); first = false;
        doc.setFontSize(26); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.text("ALEA SISTEMI", margin, 20);
        doc.setFontSize(10); doc.setTextColor(220, 38, 38); doc.text("DISTINTA TAGLIO PANNELLI", margin, 26);
        
        doc.setFontSize(12); doc.setTextColor(100);
        doc.text(`Cliente: ${cliente || '-'} | Commessa: ${commessa || '-'}`, margin, 35);
        doc.setTextColor(15, 23, 42); doc.setFontSize(13);
        doc.text(`Codice: ${groupCode} | Materiale: ${group.material}`, margin, 44);
        doc.setFontSize(11); doc.text(`Lastra Grezza: ${sheetW} x ${sheetH} mm | Foglio ${sIdx + 1}`, margin, 50);

        const scale = Math.min((pageWidth - 2 * margin) / sheetW, 130 / sheetH);
        const offsetX = (pageWidth - sheetW * scale) / 2;
        const offsetY = 65;
        doc.setDrawColor(0); doc.setLineWidth(0.5);
        doc.rect(offsetX, offsetY, sheetW * scale, sheetH * scale);

        const legendMap = new Map<string, number>();
        let nextIdx = 1;

        sheet.panels.forEach(p => {
          doc.setFillColor(245, 245, 245);
          doc.rect(offsetX + p.x * scale, offsetY + p.y * scale, p.w * scale, p.h * scale, 'FD');
          
          const label = `${p.w}x${p.h}`;
          const fits = (p.w * scale > 18) && (p.h * scale > 8);
          
          let textToShow = label;
          if (!fits) {
            if (!legendMap.has(label)) legendMap.set(label, nextIdx++);
            textToShow = String(legendMap.get(label));
          }

          doc.setFontSize(fits ? 7 : 9); 
          doc.setTextColor(0); 
          doc.setFont("helvetica", "bold");
          doc.text(textToShow, offsetX + (p.x + p.w/2)*scale, offsetY + (p.y + p.h/2)*scale + 1, { align: 'center' });
        });
        
        // RIEPILOGO PEZZI NEL FOGLIO
        let summaryY = offsetY + (sheetH * scale) + 10;
        doc.setFontSize(9); doc.setTextColor(220, 38, 38); doc.setFont("helvetica", "bold");
        doc.text("RIEPILOGO PEZZI IN QUESTO FOGLIO:", margin, summaryY);
        
        const summary: Record<string, number> = {};
        sheet.panels.forEach(p => {
          const key = `${p.w}x${p.h}`;
          summary[key] = (summary[key] || 0) + 1;
        });
        
        summaryY += 6;
        doc.setFontSize(10); doc.setTextColor(0); doc.setFont("helvetica", "normal");
        let startX = margin;
        Object.entries(summary).sort((a,b) => b[1]-a[1]).forEach(([dim, q], i) => {
          doc.text(`${q}x ${dim} mm`, startX, summaryY);
          startX += 45;
          if ((i + 1) % 4 === 0) { startX = margin; summaryY += 6; }
        });

        if (legendMap.size > 0) {
          summaryY += 10;
          doc.setFontSize(9); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold");
          doc.text("LEGENDA PEZZI PICCOLI:", margin, summaryY);
          
          summaryY += 6;
          doc.setFontSize(10); doc.setTextColor(0); doc.setFont("helvetica", "normal");
          let lx = margin;
          Array.from(legendMap.entries()).sort((a,b) => a[1]-b[1]).forEach(([dim, idx], i) => {
            doc.text(`${idx}) ${dim} mm`, lx, summaryY);
            lx += 45;
            if ((i + 1) % 4 === 0) { lx = margin; summaryY += 6; }
          });
        }

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
