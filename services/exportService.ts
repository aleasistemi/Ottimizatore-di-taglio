
import { OptimizationResult, PanelOptimizationResult, GroupedBarResult, OptimizedBar } from '../types';

export const exportService = {
  toPdf: (results: OptimizationResult, cliente: string, commessa: string, grouped: boolean = true) => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = 210;
    doc.setFontSize(28); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.text("ALEA SISTEMI", margin, 25);
    doc.setFontSize(10); doc.setTextColor(220, 38, 38); doc.setFont("helvetica", "bold"); doc.text("OTTIMIZZATORE PROFESSIONALE DI TAGLIO", margin, 31, { charSpace: 2 });
    doc.setDrawColor(226, 232, 240); doc.line(margin, 38, 200, 38);
    doc.setFontSize(10); doc.setTextColor(100); doc.setFont("helvetica", "bold"); doc.text("CLIENTE:", margin, 48); doc.text("COMMESSA:", margin, 54); doc.text("DATA:", 150, 48);
    doc.setTextColor(40); doc.setFont("helvetica", "normal"); doc.text(cliente || 'N/D', margin + 25, 48); doc.text(commessa || 'N/D', margin + 25, 54); doc.text(new Date().toLocaleDateString('it-IT'), 165, 48);

    let y = 65;
    const pageHeight = doc.internal.pageSize.height;

    for (const [code, data] of Object.entries(results)) {
      if (y > pageHeight - 60) { doc.addPage(); y = 20; }
      doc.setFillColor(15, 23, 42); doc.rect(margin, y, 180, 10, 'F');
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(255); doc.text(`${code} - ${data.descrizione.toUpperCase()}`, margin + 5, y + 7);
      y += 15;
      doc.setTextColor(15, 23, 42); doc.setFontSize(10); doc.text("1. RIEPILOGO MATERIALE E TAGLI", margin, y);
      y += 5;
      const pezziSummary: Record<string, { qty: number, lung: number, angoli: string }> = {};
      data.barre.forEach(bar => { bar.tagli.forEach(t => { const key = `${t.lung}-${t.angoli}`; if (pezziSummary[key]) pezziSummary[key].qty++; else pezziSummary[key] = { qty: 1, lung: t.lung, angoli: t.angoli }; }); });
      const sortedPezzi = Object.values(pezziSummary).sort((a, b) => b.lung - a.lung);
      doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252); doc.rect(margin, y, 85, 25, 'FD');
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("BARRE DA PRELEVARE", margin + 5, y + 7);
      doc.setFontSize(14); doc.setTextColor(220, 38, 38); doc.text(`${data.barre.length} BARRE`, margin + 5, y + 16);
      doc.setFontSize(8); doc.setTextColor(100); doc.setFont("helvetica", "normal"); doc.text(`Profilo: ${code}`, margin + 5, y + 21);
      doc.rect(margin + 95, y, 85, 25, 'FD');
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(15, 23, 42); doc.text("TOTALE PEZZI TAGLIATI", margin + 100, y + 7);
      doc.setFontSize(14); doc.text(`${sortedPezzi.reduce((s, p) => s + p.qty, 0)} PEZZI`, margin + 100, y + 16);
      y += 32;
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text("Controllo conteggio pezzi:", margin, y);
      y += 6; doc.setFont("helvetica", "normal"); doc.setFontSize(8); let colX = margin;
      sortedPezzi.forEach((p, idx) => { doc.text(`${p.qty}x ${p.lung}mm (${p.angoli})`, colX, y); colX += 45; if (colX > 160) { colX = margin; y += 5; } if (y > pageHeight - 20) { doc.addPage(); y = 20; colX = margin; } });
      y += 12;
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42); doc.text("2. SCHEMI DI TAGLIO DETTAGLIATI", margin, y);
      y += 8;
      let barreDaStampare = grouped ? Object.values(data.barre.reduce((acc: any, bar) => { const f = bar.tagli.map(t => `${t.lung}-${t.angoli}`).join('|'); if (acc[f]) acc[f].count++; else acc[f] = { ...bar, count: 1 }; return acc; }, {})) : data.barre.map(b => ({ ...b, count: 1 }));
      barreDaStampare.forEach((bar: any, idx) => { if (y > pageHeight - 35) { doc.addPage(); y = 25; } doc.setDrawColor(241, 245, 249); doc.setFillColor(248, 250, 252); doc.rect(margin, y - 5, 180, 20, 'FD'); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(15, 23, 42); doc.text(bar.count > 1 ? `${bar.count}x BARRE IDENTICHE` : `BARRA ${idx + 1}`, margin + 5, y); doc.setFontSize(8); doc.setTextColor(100); doc.text(`TAGLIO: ${bar.somma} mm  |  SCARTO: ${bar.residuo} mm`, margin + 5, y + 6); y += 12; doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30, 41, 59); const cutsStr = bar.riepilogo; const splitText = doc.splitTextToSize(`Schema: ${cutsStr}`, 170); doc.text(splitText, margin + 5, y); y += (splitText.length * 5) + 8; });
      y += 10;
    }
    doc.save(`ALEA_Distinta_Barre_${commessa || 'Taglio'}.pdf`);
  },

  panelToPdf: (results: PanelOptimizationResult, cliente: string, commessa: string, sheetW: number, sheetH: number) => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const margin = 15;
    const pageWidth = 210;
    const pageHeight = 297;
    let firstPage = true;
    const colori: Record<string, string> = { "Lexan":"#FF9999","Dibond":"#99CCFF","Alveolare":"#99FF99","Pvc":"#FFCC99","Vetro":"#CCCCCC" };

    Object.values(results).forEach(group => {
      group.sheets.forEach((sheet, sIdx) => {
        if (!firstPage) doc.addPage();
        firstPage = false;
        doc.setFontSize(22); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.text("ALEA SISTEMI", margin, 20);
        doc.setFontSize(9); doc.setTextColor(220, 38, 38); doc.text("OTTIMIZZATORE PANNELLI", margin, 25, { charSpace: 1 });
        doc.setFontSize(8); doc.setTextColor(100); doc.text(`Cliente: ${cliente || '-'} | Commessa: ${commessa || '-'}`, margin, 32);
        doc.text(`Materiale: ${group.material} | Spessore: ${group.spessore}mm | Lastra ${sIdx + 1} (${sheetW}x${sheetH}mm)`, margin, 37);

        const scale = Math.min((pageWidth - 2 * margin) / sheetW, (pageHeight - 100) / sheetH);
        const offsetX = (pageWidth - sheetW * scale) / 2;
        const offsetY = 50;

        doc.setDrawColor(0); doc.rect(offsetX, offsetY, sheetW * scale, sheetH * scale);

        sheet.panels.forEach(p => {
          const colorHex = colori[p.material] || '#CCCCCC';
          const rgb = colorHex.replace('#','').match(/\w\w/g)?.map(h => parseInt(h, 16)) || [204, 204, 204];
          doc.setFillColor(rgb[0], rgb[1], rgb[2]);
          doc.rect(offsetX + p.x * scale, offsetY + p.y * scale, p.w * scale, p.h * scale, 'FD');
          
          if (p.w * scale > 15 && p.h * scale > 10) {
            const label = `${p.w}x${p.h}`;
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            const txtWidth = doc.getTextWidth(label);
            const centerX = offsetX + (p.x + p.w / 2) * scale;
            const centerY = offsetY + (p.y + p.h / 2) * scale;
            
            // Sfondo bianco protettivo
            doc.setFillColor(255, 255, 255);
            doc.rect(centerX - (txtWidth/2 + 2), centerY - 3, txtWidth + 4, 6, 'F');
            doc.setTextColor(0);
            doc.text(label, centerX, centerY + 1, { align: 'center' });
          }
        });

        doc.setFontSize(9); doc.setTextColor(15, 23, 42);
        doc.text(`Efficienza: ${((sheet.areaUsata / (sheetW * sheetH)) * 100).toFixed(1)}% | Area Tagli: ${sheet.areaUsata.toLocaleString()} mm²`, margin, pageHeight - 15);
      });
    });
    doc.save(`ALEA_Pannelli_${commessa || 'Taglio'}.pdf`);
  },

  toCsv: (results: OptimizationResult, grouped: boolean = true) => {
    let csv = "ALEA SISTEMI - Distinta Barre\nCodice Profilo,Q.ta Barre,Lunghezza Tagli,Somma,Residuo\n";
    for (const [code, data] of Object.entries(results)) {
      data.barre.forEach((b, i) => { csv += `"${code}","1","${b.riepilogo}","${b.somma}","${b.residuo}"\n`; });
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `ALEA_Export_Barre.csv`); link.click();
  },

  panelsToCsv: (results: PanelOptimizationResult) => {
    let csv = "ALEA SISTEMI - Distinta Pannelli\nMateriale,Spessore,Larghezza,Altezza,Lastra ID,Ruotato\n";
    Object.values(results).forEach(group => {
      group.sheets.forEach((sheet, sIdx) => { sheet.panels.forEach(p => { csv += `"${group.material}","${group.spessore}","${p.w}","${p.h}","${sIdx + 1}","${p.rotated ? 'Sì' : 'No'}"\n`; }); });
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `ALEA_Export_Pannelli.csv`); link.click();
  }
};
