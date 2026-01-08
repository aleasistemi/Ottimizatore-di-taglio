
import { CutRequest, OptimizationResult, OptimizedBar, PanelCutRequest, PanelOptimizationResult, OptimizedSheet, PlacedPanel } from '../types';
import { PROFILI } from '../constants';

export const optimizerService = {
  optimizeBars: (requests: CutRequest[]): OptimizationResult => {
    const results: OptimizationResult = {};

    const grouped: Record<string, any[]> = {};
    requests.forEach(req => {
      if (!grouped[req.codice]) grouped[req.codice] = [];
      for (let i = 0; i < req.qty; i++) {
        grouped[req.codice].push({ 
          lung: req.lung, 
          angoli: req.angoli, 
          lama: req.lama, 
          scIn: req.scIn, 
          scFin: req.scFin, 
          lungBarra: req.lungBarra 
        });
      }
    });

    for (const codice in grouped) {
      const pieces = [...grouped[codice]];
      const profileInfo = PROFILI[codice];
      const maxLen = pieces[0]?.lungBarra || profileInfo.lungMax || 6000;

      pieces.sort((a, b) => b.lung - a.lung);

      const optimizedBarList: OptimizedBar[] = [];

      while (pieces.length > 0) {
        let currentBarCuts: any[] = [];
        const scIn = pieces[0].scIn;
        const scFin = pieces[0].scFin;
        const lama = pieces[0].lama;
        
        let availableSpace = maxLen - scIn - scFin;

        for (let i = 0; i < pieces.length; i++) {
          const p = pieces[i];
          if (p.lung + lama <= availableSpace) {
            currentBarCuts.push(p);
            availableSpace -= (p.lung + lama);
            pieces.splice(i, 1);
            i--;
          }
        }

        const totalCutsLength = currentBarCuts.reduce((sum, p) => sum + p.lung, 0);
        
        const summaryMap: Record<string, number> = {};
        currentBarCuts.forEach(p => {
          const key = `${p.lung}${p.angoli !== "90/90" ? ` (${p.angoli})` : ""}`;
          summaryMap[key] = (summaryMap[key] || 0) + 1;
        });
        const summaryString = Object.entries(summaryMap)
          .map(([key, count]) => `n°${count} ${key}`)
          .join(" - ");

        optimizedBarList.push({
          tagli: currentBarCuts.map(p => ({ lung: p.lung, angoli: p.angoli, lama: p.lama })),
          somma: totalCutsLength,
          residuo: parseFloat((availableSpace).toFixed(2)),
          riepilogo: summaryString
        });
      }

      results[codice] = {
        descrizione: profileInfo.descr,
        barre: optimizedBarList
      };
    }

    return results;
  },

  optimizePanels: (requests: PanelCutRequest[], sheetW: number, sheetH: number, gap: number = 5): PanelOptimizationResult => {
    const results: PanelOptimizationResult = {};

    // Group by material and thickness
    const groupedRequests: Record<string, PanelCutRequest[]> = {};
    requests.forEach(r => {
      const key = `${r.materiale}___${r.spessore}`;
      if (!groupedRequests[key]) groupedRequests[key] = [];
      groupedRequests[key].push(r);
    });

    for (const key in groupedRequests) {
      const group = groupedRequests[key];
      const material = group[0].materiale;
      const spessore = group[0].spessore;
      
      // Expand to individual panels
      let panelsToPlace: any[] = [];
      group.forEach(r => {
        for (let i = 0; i < r.quantita; i++) {
          panelsToPlace.push({ w: r.lunghezza, h: r.altezza, rot: r.rotazione, id: Math.random() });
        }
      });

      // Sort: largest dimension first
      panelsToPlace.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));

      const sheets: OptimizedSheet[] = [];

      while (panelsToPlace.length > 0) {
        let placedPanels: PlacedPanel[] = [];
        let currentX = 0;

        while (true) {
          const remW = sheetW - currentX;
          let candidates = panelsToPlace.map((p, idx) => {
            let effW = null, useRot = false;
            if (p.w <= remW) effW = p.w;
            else if (p.rot && p.h <= remW) { effW = p.h; useRot = true; }
            return { idx, p, effW, useRot };
          }).filter(c => c.effW !== null);

          if (candidates.length === 0) break;

          candidates.sort((a, b) => (b.effW || 0) - (a.effW || 0));
          const chosen = candidates[0];
          const colWidth = chosen.effW || 0;

          let currentY = 0;
          for (let i = 0; i < panelsToPlace.length; ) {
            const p = panelsToPlace[i];
            let placed = false;
            if (p.w <= colWidth && p.h <= sheetH - currentY) {
              placedPanels.push({ material, spessore, x: currentX, y: currentY, w: p.w, h: p.h, rotated: false });
              currentY += p.h + gap;
              panelsToPlace.splice(i, 1);
              placed = true;
            } else if (p.rot && p.h <= colWidth && p.w <= sheetH - currentY) {
              placedPanels.push({ material, spessore, x: currentX, y: currentY, w: p.h, h: p.w, rotated: true });
              currentY += p.w + gap;
              panelsToPlace.splice(i, 1);
              placed = true;
            } else {
              i++;
            }
            if (currentY > sheetH - 1) break;
          }

          // Safety check for first placement
          if (!placedPanels.some(s => s.x === currentX)) {
             const p = chosen.p;
             if (chosen.useRot ? p.w > sheetH : p.h > sheetH) {
               // Too big
               panelsToPlace.splice(panelsToPlace.findIndex(pp => pp.id === p.id), 1);
               continue;
             }
             placedPanels.push({ material, spessore, x: currentX, y: 0, w: chosen.useRot ? p.h : p.w, h: chosen.useRot ? p.w : p.h, rotated: chosen.useRot });
             panelsToPlace.splice(panelsToPlace.findIndex(pp => pp.id === p.id), 1);
          }

          currentX += colWidth + gap;
          if (currentX > sheetW - 1) break;
        }

        if (placedPanels.length === 0) break;

        const areaUsata = placedPanels.reduce((s, p) => s + (p.w * p.h), 0);
        sheets.push({
          panels: placedPanels,
          areaUsata,
          residuo: (sheetW * sheetH) - areaUsata
        });
      }

      results[key] = { material, spessore, sheets };
    }

    return results;
  }
};
