
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
      const maxLen = pieces[0]?.lungBarra || (profileInfo ? profileInfo.lungMax : null) || 6000;

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
        descrizione: profileInfo ? profileInfo.descr : "PROFILO GENERICO",
        barre: optimizedBarList
      };
    }

    return results;
  },

  optimizePanels: (requests: PanelCutRequest[], sheetW: number, sheetH: number, gap: number = 5): PanelOptimizationResult => {
    const results: PanelOptimizationResult = {};

    const groupedRequests: Record<string, PanelCutRequest[]> = {};
    requests.forEach(r => {
      const key = `${r.materiale}___${r.colore}`;
      if (!groupedRequests[key]) groupedRequests[key] = [];
      groupedRequests[key].push(r);
    });

    for (const key in groupedRequests) {
      const group = groupedRequests[key];
      const material = group[0].materiale;
      
      let panelsToPlace: any[] = [];
      group.forEach(r => {
        for (let i = 0; i < r.quantita; i++) {
          panelsToPlace.push({ w: r.lunghezza, h: r.altezza, rot: r.rotazione, colore: r.colore, material: r.materiale, id: Math.random() });
        }
      });

      // Sort decrescente per dimensione maggiore per ottimizzare l'ingombro iniziale delle colonne
      panelsToPlace.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));

      const sheets: OptimizedSheet[] = [];

      while (panelsToPlace.length > 0) {
        let placedPanels: PlacedPanel[] = [];
        let currentX = 0;

        while (true) {
          const remW = sheetW - currentX;
          
          // Trova il candidato per definire la larghezza della prossima colonna
          let candidates = panelsToPlace.map((p, idx) => {
            let effW = null, useRot = false;
            // Se ruotabile, proviamo entrambe le facce e prendiamo quella che "ingombra meno" in larghezza ma ci sta
            if (p.rot) {
              const minDim = Math.min(p.w, p.h);
              const maxDim = Math.max(p.w, p.h);
              if (minDim <= remW) {
                effW = minDim;
                useRot = p.w !== minDim; // Se la larghezza originale non è la minima, ruotiamo
              } else if (maxDim <= remW) {
                effW = maxDim;
                useRot = p.w !== maxDim;
              }
            } else {
              if (p.w <= remW) effW = p.w;
            }
            return { idx, p, effW, useRot };
          }).filter(c => c.effW !== null);

          if (candidates.length === 0) break;

          // Preferiamo il pezzo più largo tra i candidati per saturare la colonna
          candidates.sort((a, b) => (b.effW || 0) - (a.effW || 0));
          const chosen = candidates[0];
          const colWidth = chosen.effW || 0;

          let currentY = 0;
          for (let i = 0; i < panelsToPlace.length; ) {
            const p = panelsToPlace[i];
            let placed = false;

            // Logica di rotazione Intelligente:
            // Se il pezzo è ruotabile, controlliamo se una delle due orientazioni entra NELLA LARGHEZZA della colonna attuale
            if (p.rot) {
              // Orientamento A: p.w x p.h
              const fitsA = p.w <= colWidth && p.h <= sheetH - currentY;
              // Orientamento B: p.h x p.w
              const fitsB = p.h <= colWidth && p.w <= sheetH - currentY;

              if (fitsA && fitsB) {
                // Se entrambi entrano, scegliamo quello che occupa più larghezza della colonna (meno scarto laterale)
                if (p.w >= p.h) {
                  placedPanels.push({ material: p.material, colore: p.colore, x: currentX, y: currentY, w: p.w, h: p.h, rotated: false });
                  currentY += p.h + gap;
                } else {
                  placedPanels.push({ material: p.material, colore: p.colore, x: currentX, y: currentY, w: p.h, h: p.w, rotated: true });
                  currentY += p.w + gap;
                }
                panelsToPlace.splice(i, 1);
                placed = true;
              } else if (fitsA) {
                placedPanels.push({ material: p.material, colore: p.colore, x: currentX, y: currentY, w: p.w, h: p.h, rotated: false });
                currentY += p.h + gap;
                panelsToPlace.splice(i, 1);
                placed = true;
              } else if (fitsB) {
                placedPanels.push({ material: p.material, colore: p.colore, x: currentX, y: currentY, w: p.h, h: p.w, rotated: true });
                currentY += p.w + gap;
                panelsToPlace.splice(i, 1);
                placed = true;
              }
            } else {
              // Non ruotabile
              if (p.w <= colWidth && p.h <= sheetH - currentY) {
                placedPanels.push({ material: p.material, colore: p.colore, x: currentX, y: currentY, w: p.w, h: p.h, rotated: false });
                currentY += p.h + gap;
                panelsToPlace.splice(i, 1);
                placed = true;
              }
            }

            if (!placed) i++;
            if (currentY > sheetH - 1) break;
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

      results[key] = { material, sheets };
    }

    return results;
  }
};
